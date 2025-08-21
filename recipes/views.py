import json
from decimal import Decimal
from datetime import datetime, timedelta
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Avg, Count
from django.db import transaction
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
import uuid
from .models import Recipe, Ingredient, Instruction, Rating, RecipeRevision, ChatMessage, MealPlan, ShoppingList, ShoppingListItem, RecipeCleaningFeedback, CleaningRule, FamilyGroup, FamilyInvitation
from .services import RecipeScrapingService, create_recipe_revision
from .ai_assistant import RecipeAssistant
from .meal_planning_service import MealPlanningService
from .adaptive_cleaner import AdaptiveRecipeCleaner, initialize_default_rules


@login_required
def home(request):
    """Serve the main application page"""
    # Make sure user has a family group
    family_group = request.user.family_groups.first() or request.user.owned_families.first()
    if not family_group:
        # Create default family group for new user
        family_group = FamilyGroup.objects.create(
            name=f"{request.user.username}'s Family",
            owner=request.user
        )
        family_group.members.add(request.user)
    
    context = {
        'family_group': family_group,
        'user': request.user
    }
    return render(request, 'recipes/index.html', context)


def recipe_detail(request, recipe_id):
    """Display a single recipe on its own page"""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    
    # Get user's rating if exists
    user_rating = None
    if request.session.session_key:
        try:
            rating = Rating.objects.get(recipe=recipe, session_id=request.session.session_key)
            user_rating = rating.rating
        except Rating.DoesNotExist:
            pass
    
    context = {
        'recipe': recipe,
        'user_rating': user_rating,
    }
    return render(request, 'recipes/recipe_detail.html', context)


def recipe_edit(request, recipe_id):
    """Display the edit form for a recipe"""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    context = {
        'recipe': recipe,
    }
    return render(request, 'recipes/recipe_edit.html', context)


@require_http_methods(["GET"])
def get_recipes(request):
    """Get all recipes with optional search"""
    query = request.GET.get('q', '')
    
    if query:
        recipes = Recipe.objects.filter(
            Q(title__icontains=query) | Q(description__icontains=query)
        ).order_by('-average_rating', '-created_at')
    else:
        recipes = Recipe.objects.all().order_by('-created_at')
    
    recipes_data = []
    for recipe in recipes:
        recipes_data.append({
            'id': recipe.id,
            'title': recipe.title,
            'description': recipe.description,
            'image_url': recipe.image_url,
            'source_url': recipe.source_url,
            'prep_time_minutes': recipe.prep_time_minutes,
            'cook_time_minutes': recipe.cook_time_minutes,
            'servings': recipe.servings,
            'difficulty': recipe.difficulty,
            'category': recipe.category,
            'tags': recipe.tags,
            'notes': recipe.notes,
            'is_favorite': recipe.is_favorite,
            'average_rating': str(recipe.average_rating),
            'rating_count': recipe.rating_count,
            'is_cloned': recipe.is_cloned,
            'original_recipe_id': recipe.original_recipe.id if recipe.original_recipe else None,
            'created_at': recipe.created_at.isoformat(),
        })
    
    return JsonResponse(recipes_data, safe=False)


@require_http_methods(["GET"])
def get_recipe(request, recipe_id):
    """Get a single recipe with ingredients and instructions"""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    
    recipe_data = {
        'id': recipe.id,
        'title': recipe.title,
        'description': recipe.description,
        'image_url': recipe.image_url,
        'source_url': recipe.source_url,
        'prep_time_minutes': recipe.prep_time_minutes,
        'cook_time_minutes': recipe.cook_time_minutes,
        'servings': recipe.servings,
        'difficulty': recipe.difficulty,
        'category': recipe.category,
        'tags': recipe.tags,
        'notes': recipe.notes,
        'is_favorite': recipe.is_favorite,
        'average_rating': str(recipe.average_rating),
        'rating_count': recipe.rating_count,
        'is_cloned': recipe.is_cloned,
        'original_recipe_id': recipe.original_recipe.id if recipe.original_recipe else None,
        'created_at': recipe.created_at.isoformat(),
        'ingredients': [
            {
                'id': ing.id,
                'name': ing.name,
                'quantity': ing.quantity,
                'brand': ing.brand,
                'price': str(ing.price) if ing.price else None,
                'order': ing.order,
            }
            for ing in recipe.ingredients.all()
        ],
        'instructions': [
            {
                'id': inst.id,
                'description': inst.description,
                'timeframe': inst.timeframe,
                'order': inst.order,
            }
            for inst in recipe.instructions.all()
        ]
    }
    
    return JsonResponse(recipe_data)


@csrf_exempt
@require_http_methods(["POST"])
def scrape_recipe(request):
    """Scrape recipe from URL and return data for preview"""
    try:
        data = json.loads(request.body)
        url = data.get('url')
        save_directly = data.get('save_directly', False)
        enable_cleaning = data.get('enable_cleaning', True)  # Default to True
        
        if not url:
            return JsonResponse({'error': 'URL is required'}, status=400)
        
        # Validate URL format
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return JsonResponse({'error': 'Invalid URL format'}, status=400)
        
        # Scrape recipe data
        scraper = RecipeScrapingService()
        scraped_data = scraper.scrape_recipe(url, enable_cleaning=enable_cleaning)
        
        # If save_directly is True, create the recipe immediately
        if save_directly:
            with transaction.atomic():
                recipe = Recipe.objects.create(
                    title=scraped_data['title'],
                    description=scraped_data.get('description', ''),
                    image_url=scraped_data.get('image_url', ''),
                    source_url=scraped_data['source_url'],
                    prep_time_minutes=scraped_data.get('prep_time_minutes'),
                    cook_time_minutes=scraped_data.get('cook_time_minutes'),
                    servings=scraped_data.get('servings'),
                )
                
                # Create ingredients
                for ing_data in scraped_data.get('ingredients', []):
                    Ingredient.objects.create(
                        recipe=recipe,
                        name=ing_data['name'],
                        quantity=ing_data['quantity'],
                        brand=ing_data.get('brand', ''),
                        price=ing_data.get('price'),
                        order=ing_data['order']
                    )
                
                # Create instructions
                for inst_data in scraped_data.get('instructions', []):
                    Instruction.objects.create(
                        recipe=recipe,
                        description=inst_data['description'],
                        timeframe=inst_data.get('timeframe', ''),
                        order=inst_data['order']
                )
                
                # Return the saved recipe data
                return JsonResponse({
                    'saved': True,
                    'id': recipe.id,
                    'title': recipe.title,
                    'description': recipe.description,
                    'image_url': recipe.image_url,
                    'source_url': recipe.source_url,
                    'prep_time_minutes': recipe.prep_time_minutes,
                    'cook_time_minutes': recipe.cook_time_minutes,
                    'servings': recipe.servings,
                    'created_at': recipe.created_at.isoformat(),
                })
        else:
            # Return scraped data for preview/editing
            return JsonResponse({
                'saved': False,
                'preview': True,
                'title': scraped_data.get('title', 'Untitled Recipe'),
                'description': scraped_data.get('description', ''),
                'image_url': scraped_data.get('image_url', ''),
                'source_url': url,
                'prep_time_minutes': scraped_data.get('prep_time_minutes'),
                'cook_time_minutes': scraped_data.get('cook_time_minutes'),
                'servings': scraped_data.get('servings'),
                'ingredients': scraped_data.get('ingredients', []),
                'instructions': scraped_data.get('instructions', [])
            })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def create_recipe(request):
    """Create a new recipe from scratch or from scraped data"""
    try:
        data = json.loads(request.body)
        
        # Create the recipe
        recipe = Recipe.objects.create(
            title=data.get('title', 'Untitled Recipe'),
            description=data.get('description', ''),
            image_url=data.get('image_url', ''),
            source_url=data.get('source_url', ''),
            prep_time_minutes=data.get('prep_time_minutes'),
            cook_time_minutes=data.get('cook_time_minutes'),
            servings=data.get('servings')
        )
        
        # Create ingredients
        for idx, ing_data in enumerate(data.get('ingredients', [])):
            Ingredient.objects.create(
                recipe=recipe,
                quantity=ing_data.get('quantity', ''),
                name=ing_data.get('name', ''),
                order=ing_data.get('order', idx + 1)
            )
        
        # Create instructions
        for idx, inst_data in enumerate(data.get('instructions', [])):
            Instruction.objects.create(
                recipe=recipe,
                description=inst_data.get('description', ''),
                order=inst_data.get('order', idx + 1)
            )
        
        # Create initial revision
        create_recipe_revision(recipe, "Initial recipe creation")
        
        # Return the created recipe
        return JsonResponse({
            'id': recipe.id,
            'title': recipe.title,
            'description': recipe.description,
            'image_url': recipe.image_url,
            'source_url': recipe.source_url,
            'prep_time_minutes': recipe.prep_time_minutes,
            'cook_time_minutes': recipe.cook_time_minutes,
            'servings': recipe.servings,
            'created_at': recipe.created_at.isoformat(),
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def clone_recipe(request, recipe_id):
    """Clone and modify a recipe"""
    try:
        original_recipe = get_object_or_404(Recipe, id=recipe_id)
        data = json.loads(request.body)
        
        with transaction.atomic():
            # Create cloned recipe
            cloned_recipe = Recipe.objects.create(
                title=data.get('title', f"{original_recipe.title} (Copy)"),
                description=data.get('description', original_recipe.description),
                image_url=original_recipe.image_url,
                source_url=original_recipe.source_url,
                prep_time_minutes=data.get('prep_time_minutes', original_recipe.prep_time_minutes),
                cook_time_minutes=data.get('cook_time_minutes', original_recipe.cook_time_minutes),
                servings=data.get('servings', original_recipe.servings),
                is_cloned=True,
                original_recipe=original_recipe,
            )
            
            # Create ingredients
            ingredients_data = data.get('ingredients', [
                {
                    'name': ing.name,
                    'quantity': ing.quantity,
                    'brand': ing.brand,
                    'price': str(ing.price) if ing.price else None,
                    'order': ing.order
                }
                for ing in original_recipe.ingredients.all()
            ])
            
            for i, ing_data in enumerate(ingredients_data):
                Ingredient.objects.create(
                    recipe=cloned_recipe,
                    name=ing_data['name'],
                    quantity=ing_data['quantity'],
                    brand=ing_data.get('brand', ''),
                    price=Decimal(ing_data['price']) if ing_data.get('price') else None,
                    order=i + 1
                )
            
            # Create instructions
            instructions_data = data.get('instructions', [
                {
                    'description': inst.description,
                    'timeframe': inst.timeframe,
                    'order': inst.order
                }
                for inst in original_recipe.instructions.all()
            ])
            
            for i, inst_data in enumerate(instructions_data):
                Instruction.objects.create(
                    recipe=cloned_recipe,
                    description=inst_data['description'],
                    timeframe=inst_data.get('timeframe', ''),
                    order=i + 1
                )
        
        # Create initial revision for cloned recipe
        create_recipe_revision(cloned_recipe, f"Cloned from '{original_recipe.title}'")
        
        # Return complete cloned recipe data
        return get_recipe(request, cloned_recipe.id)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def update_recipe(request, recipe_id):
    """Update a recipe"""
    print(f"UPDATE_RECIPE called with method: {request.method} for recipe_id: {recipe_id}")
    
    # Manually check for PATCH method
    if request.method != 'PATCH':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        recipe = get_object_or_404(Recipe, id=recipe_id)
        data = json.loads(request.body)
        
        with transaction.atomic():
            # Update recipe fields
            if 'title' in data:
                recipe.title = data['title']
            if 'description' in data:
                recipe.description = data['description']
            if 'prep_time_minutes' in data:
                recipe.prep_time_minutes = data['prep_time_minutes']
            if 'cook_time_minutes' in data:
                recipe.cook_time_minutes = data['cook_time_minutes']
            if 'servings' in data:
                recipe.servings = data['servings']
            if 'image_url' in data:
                recipe.image_url = data['image_url']
            
            recipe.save()
            
            # Update ingredients if provided
            if 'ingredients' in data:
                recipe.ingredients.all().delete()
                for i, ing_data in enumerate(data['ingredients']):
                    Ingredient.objects.create(
                        recipe=recipe,
                        name=ing_data['name'],
                        quantity=ing_data['quantity'],
                        brand=ing_data.get('brand', ''),
                        price=Decimal(ing_data['price']) if ing_data.get('price') else None,
                        order=i + 1
                    )
            
            # Update instructions if provided
            if 'instructions' in data:
                recipe.instructions.all().delete()
                for i, inst_data in enumerate(data['instructions']):
                    Instruction.objects.create(
                        recipe=recipe,
                        description=inst_data['description'],
                        timeframe=inst_data.get('timeframe', ''),
                        order=i + 1
                    )
        
        # Create revision with change summary
        change_summary = f"Updated recipe"
        if 'title' in data:
            change_summary = f"Updated title and other fields"
        elif 'ingredients' in data:
            change_summary = f"Updated ingredients"
        elif 'instructions' in data:
            change_summary = f"Updated instructions"
            
        create_recipe_revision(recipe, change_summary)
        
        # Return updated recipe data as JSON
        recipe_data = {
            'id': recipe.id,
            'title': recipe.title,
            'description': recipe.description,
            'image_url': recipe.image_url,
            'source_url': recipe.source_url,
            'prep_time_minutes': recipe.prep_time_minutes,
            'cook_time_minutes': recipe.cook_time_minutes,
            'servings': recipe.servings,
            'difficulty': recipe.difficulty,
            'category': recipe.category,
            'tags': recipe.tags,
            'notes': recipe.notes,
            'is_favorite': recipe.is_favorite,
            'average_rating': str(recipe.average_rating),
            'rating_count': recipe.rating_count,
            'is_cloned': recipe.is_cloned,
            'original_recipe_id': recipe.original_recipe.id if recipe.original_recipe else None,
            'created_at': recipe.created_at.isoformat(),
            'ingredients': [
                {
                    'name': ing.name,
                    'quantity': ing.quantity,
                    'brand': ing.brand,
                    'price': str(ing.price) if ing.price else None,
                    'order': ing.order
                }
                for ing in recipe.ingredients.all().order_by('order')
            ],
            'instructions': [
                {
                    'description': inst.description,
                    'timeframe': inst.timeframe,
                    'order': inst.order
                }
                for inst in recipe.instructions.all().order_by('order')
            ]
        }
        
        return JsonResponse(recipe_data)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def rate_recipe(request, recipe_id):
    """Rate a recipe"""
    try:
        recipe = get_object_or_404(Recipe, id=recipe_id)
        data = json.loads(request.body)
        rating_value = data.get('rating')
        
        if not rating_value or not (1 <= rating_value <= 5):
            return JsonResponse({'error': 'Rating must be between 1 and 5'}, status=400)
        
        # Get or create session key for anonymous rating
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Update or create rating
        rating, created = Rating.objects.update_or_create(
            recipe=recipe,
            session_id=session_id,
            defaults={'rating': rating_value}
        )
        
        # Update recipe average rating
        ratings = recipe.ratings.all()
        avg_rating = ratings.aggregate(Avg('rating'))['rating__avg'] or 0
        recipe.average_rating = round(avg_rating, 2)
        recipe.rating_count = ratings.count()
        recipe.save()
        
        return JsonResponse({
            'id': rating.id,
            'rating': rating.rating,
            'recipe_id': recipe.id,
            'created_at': rating.created_at.isoformat(),
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_recipe(request, recipe_id):
    """Delete a recipe"""
    try:
        recipe = get_object_or_404(Recipe, id=recipe_id)
        recipe.delete()
        return JsonResponse({'message': 'Recipe deleted successfully'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def get_shopping_list(request):
    """Get shopping list items for selected ingredients"""
    try:
        data = json.loads(request.body)
        ingredient_ids = data.get('ingredient_ids', [])
        
        if not isinstance(ingredient_ids, list):
            return JsonResponse({'error': 'ingredient_ids must be an array'}, status=400)
        
        ingredients = Ingredient.objects.filter(id__in=ingredient_ids)
        
        shopping_list = []
        for ingredient in ingredients:
            shopping_list.append({
                'id': ingredient.id,
                'name': ingredient.name,
                'quantity': ingredient.quantity,
                'brand': ingredient.brand,
                'price': str(ingredient.price) if ingredient.price else None,
                'recipe_title': ingredient.recipe.title,
            })
        
        return JsonResponse(shopping_list, safe=False)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_recipe_revisions(request, recipe_id):
    """Get all revisions for a recipe"""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    revisions = recipe.revisions.all()
    
    revisions_data = []
    for revision in revisions:
        revisions_data.append({
            'id': revision.id,
            'revision_number': revision.revision_number,
            'title': revision.title,
            'description': revision.description,
            'change_summary': revision.change_summary,
            'created_at': revision.created_at.isoformat(),
            'ingredients_count': len(revision.ingredients_data),
            'instructions_count': len(revision.instructions_data),
        })
    
    return JsonResponse({
        'recipe_id': recipe.id,
        'current_title': recipe.title,
        'revisions': revisions_data
    })


@require_http_methods(["GET"])
def get_revision_details(request, recipe_id, revision_number):
    """Get details of a specific revision"""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    revision = get_object_or_404(RecipeRevision, recipe=recipe, revision_number=revision_number)
    
    return JsonResponse({
        'id': revision.id,
        'recipe_id': recipe.id,
        'revision_number': revision.revision_number,
        'title': revision.title,
        'description': revision.description,
        'image_url': revision.image_url,
        'source_url': revision.source_url,
        'prep_time_minutes': revision.prep_time_minutes,
        'cook_time_minutes': revision.cook_time_minutes,
        'servings': revision.servings,
        'difficulty': revision.difficulty,
        'category': revision.category,
        'tags': revision.tags,
        'notes': revision.notes,
        'is_favorite': revision.is_favorite,
        'is_cloned': revision.is_cloned,
        'original_recipe_id': revision.original_recipe_id,
        'change_summary': revision.change_summary,
        'created_at': revision.created_at.isoformat(),
        'ingredients': revision.ingredients_data,
        'instructions': revision.instructions_data,
    })


@csrf_exempt
@require_http_methods(["POST"])
def chat_message(request):
    """Send a chat message to the AI assistant"""
    try:
        data = json.loads(request.body)
        message = data.get('message', '').strip()
        recipe_id = data.get('recipe_id')
        
        if not message:
            return JsonResponse({'error': 'Message is required'}, status=400)
        
        # Get or create session key
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Get recipe context if provided
        recipe_context = None
        if recipe_id:
            recipe_context = get_object_or_404(Recipe, id=recipe_id)
        
        # Create assistant and get response
        assistant = RecipeAssistant(session_id, recipe_context)
        response = assistant.chat(message)
        
        return JsonResponse(response)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def chat_history(request):
    """Get chat history for the current session"""
    try:
        recipe_id = request.GET.get('recipe_id')
        
        # Get or create session key
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Get recipe context if provided
        recipe_context = None
        if recipe_id:
            recipe_context = get_object_or_404(Recipe, id=recipe_id)
        
        # Try to get chat history without creating full assistant
        # Just query messages directly for faster response
        messages = ChatMessage.objects.filter(
            session_id=session_id,
            recipe=recipe_context
        ).order_by('created_at')
        
        history = [
            {
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.created_at.isoformat()
            }
            for msg in messages
        ]
        
        return JsonResponse({
            'session_id': session_id,
            'recipe_id': recipe_id,
            'messages': history
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Chat history error: {error_details}")
        return JsonResponse({'error': str(e), 'details': error_details}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def clear_chat(request):
    """Clear chat history for the current session"""
    try:
        data = json.loads(request.body)
        recipe_id = data.get('recipe_id')
        
        # Get session key
        if not request.session.session_key:
            return JsonResponse({'message': 'No chat history to clear'})
        
        session_id = request.session.session_key
        
        # Delete chat messages
        query = ChatMessage.objects.filter(session_id=session_id)
        if recipe_id:
            query = query.filter(recipe_id=recipe_id)
        
        deleted_count = query.count()
        query.delete()
        
        return JsonResponse({
            'message': f'Cleared {deleted_count} messages',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# Meal Planning Views
@csrf_exempt
@require_http_methods(["POST"])
def add_to_meal_plan(request):
    """Add a recipe to the meal plan"""
    try:
        data = json.loads(request.body)
        recipe_id = data.get('recipe_id')
        date_str = data.get('date')
        meal_type = data.get('meal_type', 'dinner')
        notes = data.get('notes', '')
        
        if not recipe_id or not date_str:
            return JsonResponse({'error': 'recipe_id and date are required'}, status=400)
        
        # Get or create session key
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Parse date
        from datetime import datetime
        meal_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Add to meal plan
        service = MealPlanningService()
        meal_plan = service.add_recipe_to_meal_plan(
            session_id=session_id,
            recipe_id=recipe_id,
            date=meal_date,
            meal_type=meal_type,
            notes=notes
        )
        
        return JsonResponse({
            'id': meal_plan.id,
            'recipe_id': meal_plan.recipe.id,
            'recipe_title': meal_plan.recipe.title,
            'date': meal_plan.date.isoformat(),
            'meal_type': meal_plan.meal_type,
            'notes': meal_plan.notes
        })
        
    except Recipe.DoesNotExist:
        return JsonResponse({'error': 'Recipe not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def remove_from_meal_plan(request, meal_plan_id):
    """Remove a recipe from the meal plan"""
    try:
        # Get session key
        if not request.session.session_key:
            return JsonResponse({'error': 'No meal plan found'}, status=404)
        session_id = request.session.session_key
        
        # Remove from meal plan
        service = MealPlanningService()
        success = service.remove_from_meal_plan(session_id, meal_plan_id)
        
        if success:
            return JsonResponse({'message': 'Removed from meal plan'})
        else:
            return JsonResponse({'error': 'Meal plan not found'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def save_meal_plan(request):
    """Save all meal plan changes for a week"""
    try:
        data = json.loads(request.body)
        week_start = data.get('week_start')
        week_end = data.get('week_end')
        meal_plans = data.get('meal_plans', {})
        
        # Get or create session key
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Since the meal plans are already saved via add_to_meal_plan,
        # this endpoint just confirms the save was successful
        # In a production app, you might want to batch save all changes here
        
        return JsonResponse({
            'message': 'Meal plans saved successfully',
            'week_start': week_start,
            'week_end': week_end
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_week_meal_plan(request):
    """Get meal plans for a week"""
    try:
        week_start = request.GET.get('week_start')
        
        if not week_start:
            from datetime import datetime
            # Default to current week
            today = datetime.now().date()
            week_start = today - timedelta(days=today.weekday())
        else:
            from datetime import datetime
            week_start = datetime.strptime(week_start, '%Y-%m-%d').date()
        
        # Get or create session key
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Get meal plans
        service = MealPlanningService()
        week_data = service.get_week_meal_plans(session_id, week_start)
        
        # Format response
        formatted_data = {}
        for date_str, meal_plans in week_data.items():
            formatted_data[date_str] = [
                {
                    'id': mp.id,
                    'recipe_id': mp.recipe.id,
                    'recipe_title': mp.recipe.title,
                    'recipe_image': mp.recipe.image_url,
                    'meal_type': mp.meal_type,
                    'notes': mp.notes,
                    'prep_time': mp.recipe.prep_time_minutes,
                    'cook_time': mp.recipe.cook_time_minutes
                }
                for mp in meal_plans
            ]
        
        return JsonResponse({
            'week_start': week_start.isoformat(),
            'meal_plans': formatted_data
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def generate_shopping_list(request):
    """Generate a shopping list from a week's meal plans"""
    try:
        data = json.loads(request.body)
        week_start = data.get('week_start')
        
        if not week_start:
            return JsonResponse({'error': 'week_start is required'}, status=400)
        
        from datetime import datetime
        start_date = datetime.strptime(week_start, '%Y-%m-%d').date()
        end_date = start_date + timedelta(days=6)
        
        # Get or create session key
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Generate shopping list
        service = MealPlanningService()
        shopping_list = service.generate_weekly_shopping_list(
            session_id=session_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Format response
        items = [
            {
                'id': item.id,
                'name': item.name,
                'quantity': item.quantity,
                'category': item.category,
                'notes': item.notes,
                'is_purchased': item.is_purchased
            }
            for item in shopping_list.items.all()
        ]
        
        return JsonResponse({
            'id': shopping_list.id,
            'name': shopping_list.name,
            'start_date': shopping_list.start_date.isoformat(),
            'end_date': shopping_list.end_date.isoformat(),
            'items': items
        })
        
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_shopping_lists(request):
    """Get all shopping lists for the session"""
    try:
        # Get or create session key
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Get shopping lists
        shopping_lists = ShoppingList.objects.filter(
            session_id=session_id
        ).order_by('-created_at')
        
        # Format response
        lists_data = []
        for sl in shopping_lists:
            lists_data.append({
                'id': sl.id,
                'name': sl.name,
                'start_date': sl.start_date.isoformat(),
                'end_date': sl.end_date.isoformat(),
                'created_at': sl.created_at.isoformat(),
                'item_count': sl.items.count(),
                'purchased_count': sl.items.filter(is_purchased=True).count()
            })
        
        return JsonResponse({'shopping_lists': lists_data})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["PATCH"])
def update_shopping_item(request, item_id):
    """Update a shopping list item (mark as purchased, etc)"""
    try:
        data = json.loads(request.body)
        
        # Get session key
        if not request.session.session_key:
            return JsonResponse({'error': 'No shopping list found'}, status=404)
        session_id = request.session.session_key
        
        # Update item
        item = get_object_or_404(
            ShoppingListItem, 
            id=item_id, 
            shopping_list__session_id=session_id
        )
        
        if 'is_purchased' in data:
            item.is_purchased = data['is_purchased']
        if 'notes' in data:
            item.notes = data['notes']
        
        item.save()
        
        return JsonResponse({
            'id': item.id,
            'is_purchased': item.is_purchased,
            'notes': item.notes
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def shopping_lists(request):
    """Display all shopping lists for the user"""
    # Get user's family group
    family_group = request.user.family_groups.first() or request.user.owned_families.first()
    
    if family_group:
        # Get shopping lists for the family
        shopping_lists = ShoppingList.objects.filter(
            family_group=family_group
        ).order_by('-created_at')
    else:
        shopping_lists = []
    
    context = {
        'shopping_lists': shopping_lists,
    }
    return render(request, 'recipes/shopping_lists.html', context)


def shopping_list_detail(request, list_id):
    """Display a single shopping list with aggregated ingredients"""
    # Get or create session key
    if not request.session.session_key:
        request.session.create()
    session_id = request.session.session_key
    
    # Get the shopping list
    shopping_list = get_object_or_404(ShoppingList, id=list_id, session_id=session_id)
    
    # Get all items with their recipe sources
    items_with_recipes = []
    for item in shopping_list.items.all():
        items_with_recipes.append({
            'item': item,
            'recipes': item.recipe_sources.all()
        })
    
    context = {
        'shopping_list': shopping_list,
        'items_with_recipes': items_with_recipes,
    }
    return render(request, 'recipes/shopping_list_detail.html', context)


# Recipe Cleaning Feedback Views
@csrf_exempt
@require_http_methods(["POST"])
def submit_cleaning_feedback(request, recipe_id):
    """Submit feedback on recipe cleaning quality"""
    try:
        recipe = get_object_or_404(Recipe, id=recipe_id)
        data = json.loads(request.body)
        
        # Get or create session key
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Create feedback record
        feedback = RecipeCleaningFeedback.objects.create(
            recipe=recipe,
            original_data=data.get('original_data', {}),
            cleaned_data=data.get('cleaned_data', {}),
            user_corrections=data.get('user_corrections'),
            feedback_type=data.get('feedback_type', 'good'),
            specific_issues=data.get('specific_issues', []),
            notes=data.get('notes', ''),
            session_id=session_id
        )
        
        # If it's negative feedback with corrections, learn from it
        if feedback.feedback_type == 'needs_improvement' and feedback.user_corrections:
            cleaner = AdaptiveRecipeCleaner()
            new_rules = cleaner.learn_from_feedback()
            
        return JsonResponse({
            'success': True,
            'feedback_id': feedback.id,
            'message': 'Thank you for your feedback!'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_cleaning_stats(request):
    """Get statistics about recipe cleaning"""
    try:
        # Initialize default rules if needed
        if CleaningRule.objects.count() == 0:
            created_count = initialize_default_rules()
        
        # Get stats
        total_feedback = RecipeCleaningFeedback.objects.count()
        good_feedback = RecipeCleaningFeedback.objects.filter(feedback_type='good').count()
        needs_improvement = RecipeCleaningFeedback.objects.filter(feedback_type='needs_improvement').count()
        
        active_rules = CleaningRule.objects.filter(is_active=True).count()
        learned_rules = CleaningRule.objects.filter(created_from_feedback=True).count()
        
        # Get top performing rules
        top_rules = CleaningRule.objects.filter(is_active=True).order_by('-success_count')[:5]
        
        return JsonResponse({
            'feedback_stats': {
                'total': total_feedback,
                'good': good_feedback,
                'needs_improvement': needs_improvement,
                'satisfaction_rate': (good_feedback / total_feedback * 100) if total_feedback > 0 else 0
            },
            'rules_stats': {
                'active': active_rules,
                'learned': learned_rules,
                'top_rules': [
                    {
                        'pattern': rule.pattern,
                        'replacement': rule.replacement,
                        'category': rule.category,
                        'success_rate': rule.success_rate
                    }
                    for rule in top_rules
                ]
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# Authentication Views
def user_login(request):
    """Handle user login"""
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            messages.success(request, f"Welcome back, {user.username}!")
            return redirect("home")
        else:
            messages.error(request, "Invalid username or password.")
    
    return render(request, "recipes/login.html")


def user_signup(request):
    """Handle user registration"""
    if request.method == "POST":
        username = request.POST.get("username")
        email = request.POST.get("email")
        password1 = request.POST.get("password1")
        password2 = request.POST.get("password2")
        family_name = request.POST.get("family_name", "")
        
        # Validation
        if password1 != password2:
            messages.error(request, "Passwords do not match.")
            return render(request, "recipes/signup.html")
        
        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already exists.")
            return render(request, "recipes/signup.html")
        
        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already registered.")
            return render(request, "recipes/signup.html")
        
        # Create user
        user = User.objects.create_user(username=username, email=email, password=password1)
        
        # Create family group
        family_group = FamilyGroup.objects.create(
            name=family_name or f"{username}'s Family",
            owner=user
        )
        family_group.members.add(user)
        
        # Log the user in
        login(request, user)
        messages.success(request, "Account created successfully! Welcome to Recipe Remix!")
        return redirect("home")
    
    return render(request, "recipes/signup.html")


@login_required
def user_logout(request):
    """Handle user logout"""
    logout(request)
    messages.success(request, "You have been logged out successfully.")
    return redirect("login")


@login_required
def family_settings(request):
    """Manage family settings and invitations"""
    family_group = request.user.owned_families.first() or request.user.family_groups.first()
    
    if not family_group:
        messages.error(request, "No family group found.")
        return redirect("home")
    
    if request.method == "POST":
        action = request.POST.get("action")
        
        if action == "invite" and family_group.owner == request.user:
            email = request.POST.get("email")
            
            # Create invitation
            invitation = FamilyInvitation.objects.create(
                family=family_group,
                email=email,
                invited_by=request.user,
                invite_code=str(uuid.uuid4())
            )
            
            messages.success(request, f"Invitation sent to {email}. Code: {invitation.invite_code}")
    
    invitations = FamilyInvitation.objects.filter(family=family_group, used=False)
    
    context = {
        "family_group": family_group,
        "invitations": invitations,
        "is_owner": family_group.owner == request.user
    }
    return render(request, "recipes/family_settings.html", context)


def join_family(request, invite_code=None):
    """Join a family group using an invitation code"""
    if request.method == "POST":
        code = request.POST.get("invite_code") or invite_code
        
        try:
            invitation = FamilyInvitation.objects.get(invite_code=code, used=False)
            
            if not request.user.is_authenticated:
                messages.info(request, "Please log in or sign up to join this family.")
                request.session["pending_invite"] = code
                return redirect("login")
            
            # Add user to family
            invitation.family.members.add(request.user)
            invitation.used = True
            invitation.used_by = request.user
            invitation.save()
            
            messages.success(request, f"You have joined {invitation.family.name}!")
            return redirect("home")
            
        except FamilyInvitation.DoesNotExist:
            messages.error(request, "Invalid or expired invitation code.")
    
    return render(request, "recipes/join_family.html", {"invite_code": invite_code})
