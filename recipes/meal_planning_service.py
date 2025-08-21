import os
import json
from datetime import date, timedelta
from typing import Dict, List, Any
from django.db import transaction
from langchain_openai import ChatOpenAI
from .models import Recipe, MealPlan, ShoppingList, ShoppingListItem


class MealPlanningService:
    """Service for meal planning and shopping list generation using AI"""
    
    def __init__(self):
        # Initialize Grok for shopping list generation
        self.llm = ChatOpenAI(
            model="grok-2-1212",
            openai_api_key=os.environ.get("XAI_API_KEY"),
            openai_api_base="https://api.x.ai/v1",
            temperature=0.3,  # Lower temperature for more consistent JSON output
        )
    
    def generate_weekly_shopping_list(self, session_id: str, start_date: date, end_date: date) -> ShoppingList:
        """Generate a shopping list from a week's meal plans using AI"""
        
        # Get all meal plans for the week
        meal_plans = MealPlan.objects.filter(
            session_id=session_id,
            date__gte=start_date,
            date__lte=end_date
        ).select_related('recipe').prefetch_related('recipe__ingredients')
        
        if not meal_plans:
            raise ValueError("No meal plans found for the specified week")
        
        # Build a map of recipes to their ingredients
        recipe_ingredients_map = {}
        recipes_data = []
        
        for meal_plan in meal_plans:
            recipe = meal_plan.recipe
            ingredients = []
            
            for ing in recipe.ingredients.all():
                ingredient_str = f"{ing.quantity} {ing.name}"
                ingredients.append(ingredient_str)
                
                # Track which recipes need each ingredient
                if ing.name not in recipe_ingredients_map:
                    recipe_ingredients_map[ing.name] = []
                recipe_ingredients_map[ing.name].append(recipe)
            
            recipes_data.append({
                'recipe_id': recipe.id,
                'date': meal_plan.date.isoformat(),
                'meal_type': meal_plan.meal_type,
                'recipe_name': recipe.title,
                'servings': recipe.servings or 4,
                'ingredients': ingredients
            })
        
        # Create prompt for AI
        prompt = f"""You are a helpful cooking assistant that creates organized shopping lists.
        
Given the following meal plans for the week, create a consolidated shopping list.
Combine similar ingredients, adjust quantities appropriately, and organize by category.

Meal Plans:
{json.dumps(recipes_data, indent=2)}

Please return a JSON object with the following structure:
{{
    "shopping_list": [
        {{
            "name": "ingredient name",
            "quantity": "total quantity needed",
            "category": "Produce|Dairy|Meat|Pantry|Frozen|Other",
            "notes": "optional notes about the ingredient",
            "original_names": ["list of original ingredient names that were combined"]
        }}
    ]
}}

Important:
- Combine duplicate ingredients and sum their quantities
- Convert units when appropriate (e.g., 2 cups + 1 cup = 3 cups)
- Include the original ingredient names that were combined in "original_names"
- Organize by category for easy shopping
- Be specific with quantities
- Return ONLY valid JSON, no additional text"""

        # Get AI response
        try:
            response = self.llm.invoke(prompt)
            result = json.loads(response.content)
            
            # Create shopping list in database
            with transaction.atomic():
                shopping_list = ShoppingList.objects.create(
                    session_id=session_id,
                    name=f"Week of {start_date.strftime('%B %d, %Y')}",
                    start_date=start_date,
                    end_date=end_date
                )
                
                # Create shopping list items with recipe tracking
                for idx, item_data in enumerate(result['shopping_list']):
                    item = ShoppingListItem.objects.create(
                        shopping_list=shopping_list,
                        name=item_data['name'],
                        quantity=item_data['quantity'],
                        category=item_data.get('category', 'Other'),
                        notes=item_data.get('notes', ''),
                        order=idx
                    )
                    
                    # Link recipes to this shopping list item
                    linked_recipes = set()
                    original_names = item_data.get('original_names', [item_data['name']])
                    
                    for original_name in original_names:
                        # Find recipes that use this ingredient
                        for key in recipe_ingredients_map.keys():
                            if original_name.lower() in key.lower() or key.lower() in original_name.lower():
                                linked_recipes.update(recipe_ingredients_map[key])
                    
                    # If we couldn't find specific matches, link all recipes that have similar ingredients
                    if not linked_recipes:
                        for meal_plan in meal_plans:
                            for ing in meal_plan.recipe.ingredients.all():
                                if item_data['name'].lower() in ing.name.lower() or ing.name.lower() in item_data['name'].lower():
                                    linked_recipes.add(meal_plan.recipe)
                                    break
                    
                    # Add the recipe relationships
                    if linked_recipes:
                        item.recipe_sources.set(linked_recipes)
                
                return shopping_list
                
        except json.JSONDecodeError as e:
            raise ValueError(f"AI returned invalid JSON: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error generating shopping list: {str(e)}")
    
    def add_recipe_to_meal_plan(self, session_id: str, recipe_id: int, date: date, meal_type: str, notes: str = "") -> MealPlan:
        """Add a recipe to the meal plan"""
        recipe = Recipe.objects.get(id=recipe_id)
        
        # Update or create meal plan
        meal_plan, created = MealPlan.objects.update_or_create(
            session_id=session_id,
            date=date,
            meal_type=meal_type,
            defaults={
                'recipe': recipe,
                'notes': notes
            }
        )
        
        return meal_plan
    
    def remove_from_meal_plan(self, session_id: str, meal_plan_id: int) -> bool:
        """Remove a recipe from the meal plan"""
        try:
            meal_plan = MealPlan.objects.get(id=meal_plan_id, session_id=session_id)
            meal_plan.delete()
            return True
        except MealPlan.DoesNotExist:
            return False
    
    def get_week_meal_plans(self, session_id: str, week_start: date) -> Dict[str, List[MealPlan]]:
        """Get all meal plans for a week organized by date"""
        week_end = week_start + timedelta(days=6)
        
        meal_plans = MealPlan.objects.filter(
            session_id=session_id,
            date__gte=week_start,
            date__lte=week_end
        ).select_related('recipe').order_by('date', 'meal_type')
        
        # Organize by date
        week_data = {}
        for i in range(7):
            current_date = week_start + timedelta(days=i)
            week_data[current_date.isoformat()] = []
        
        for meal_plan in meal_plans:
            week_data[meal_plan.date.isoformat()].append(meal_plan)
        
        return week_data