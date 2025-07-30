import os
import json
from typing import Dict, List, Any
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate


class RecipeCleaningService:
    """Service for cleaning and standardizing scraped recipe data using LLM"""
    
    def __init__(self):
        # Initialize a lightweight Grok instance for cleaning tasks
        # Using lower temperature for more consistent cleaning
        self.llm = ChatOpenAI(
            model="grok-beta",  # Using the smaller model for efficiency
            openai_api_key=os.environ.get("XAI_API_KEY"),
            openai_api_base="https://api.x.ai/v1",
            temperature=0.1,  # Low temperature for consistent cleaning
            max_tokens=2000
        )
        
        # Create prompts for cleaning different parts of recipes
        self.description_prompt = ChatPromptTemplate.from_template("""
You are a recipe editor. Clean and improve the following recipe description.
Fix any grammatical errors, remove promotional content, and make it concise and appealing.
Keep it under 150 words.

Original description: {description}

Return ONLY the cleaned description, no additional text.
""")
        
        self.ingredients_prompt = ChatPromptTemplate.from_template("""
You are a recipe editor. Clean and standardize the following ingredients list.
- Fix spelling and grammar errors
- Standardize measurements (e.g., "1 tsp" instead of "1 teaspoon")
- Remove brand names unless essential
- Ensure clear quantities
- Format consistently

Original ingredients:
{ingredients}

Return a JSON array of cleaned ingredients with this format:
[{{"quantity": "amount", "name": "ingredient name", "notes": "optional notes"}}]

Return ONLY valid JSON, no additional text.
""")
        
        self.instructions_prompt = ChatPromptTemplate.from_template("""
You are a recipe editor. Clean and improve the following cooking instructions.
- Fix grammar and spelling
- Make steps clear and concise
- Remove unnecessary commentary
- Number steps consistently
- Keep technical cooking terms accurate

Original instructions:
{instructions}

Return a JSON array of cleaned instructions with this format:
[{{"step": 1, "instruction": "cleaned instruction text"}}]

Return ONLY valid JSON, no additional text.
""")
    
    def clean_recipe(self, recipe_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean all parts of a scraped recipe"""
        cleaned_data = recipe_data.copy()
        
        try:
            # Clean description if present
            if recipe_data.get('description'):
                cleaned_data['description'] = self.clean_description(recipe_data['description'])
            
            # Clean ingredients if present
            if recipe_data.get('ingredients'):
                cleaned_data['ingredients'] = self.clean_ingredients(recipe_data['ingredients'])
            
            # Clean instructions if present
            if recipe_data.get('instructions'):
                cleaned_data['instructions'] = self.clean_instructions(recipe_data['instructions'])
            
            # Clean title - just basic cleanup without LLM
            if recipe_data.get('title'):
                cleaned_data['title'] = self.clean_title(recipe_data['title'])
                
        except Exception as e:
            print(f"Error cleaning recipe: {str(e)}")
            # Return original data if cleaning fails
            return recipe_data
        
        return cleaned_data
    
    def clean_title(self, title: str) -> str:
        """Basic title cleaning without LLM"""
        # Remove common suffixes
        suffixes_to_remove = [
            ' - Recipe', ' Recipe', ' | Allrecipes', ' - Allrecipes',
            ' | Food Network', ' - Food Network', ' | Tasty', ' - Tasty'
        ]
        
        cleaned_title = title.strip()
        for suffix in suffixes_to_remove:
            if cleaned_title.endswith(suffix):
                cleaned_title = cleaned_title[:-len(suffix)].strip()
        
        # Capitalize properly
        return ' '.join(word.capitalize() for word in cleaned_title.split())
    
    def clean_description(self, description: str) -> str:
        """Clean recipe description using LLM"""
        try:
            response = self.llm.invoke(
                self.description_prompt.format(description=description)
            )
            return response.content.strip()
        except Exception as e:
            print(f"Error cleaning description: {str(e)}")
            return description
    
    def clean_ingredients(self, ingredients: List[Any]) -> List[Dict[str, Any]]:
        """Clean ingredients list using LLM"""
        try:
            # Convert ingredients to text format
            if isinstance(ingredients[0], dict):
                ingredients_text = "\n".join([
                    f"- {ing.get('quantity', '')} {ing.get('name', '')}"
                    for ing in ingredients
                ])
            else:
                ingredients_text = "\n".join([f"- {ing}" for ing in ingredients])
            
            response = self.llm.invoke(
                self.ingredients_prompt.format(ingredients=ingredients_text)
            )
            
            # Parse JSON response
            cleaned_ingredients = json.loads(response.content.strip())
            
            # Add order numbers
            for i, ing in enumerate(cleaned_ingredients):
                ing['order'] = i + 1
                # Ensure we have the fields we need
                if 'notes' not in ing:
                    ing['notes'] = ''
                if 'quantity' not in ing:
                    ing['quantity'] = ''
            
            return cleaned_ingredients
            
        except Exception as e:
            print(f"Error cleaning ingredients: {str(e)}")
            # Return original format
            if isinstance(ingredients[0], dict):
                return ingredients
            else:
                # Convert simple list to dict format
                return [
                    {'quantity': '', 'name': str(ing), 'order': i+1}
                    for i, ing in enumerate(ingredients)
                ]
    
    def clean_instructions(self, instructions: List[Any]) -> List[Dict[str, Any]]:
        """Clean instructions list using LLM"""
        try:
            # Convert instructions to text format
            if isinstance(instructions[0], dict):
                instructions_text = "\n".join([
                    f"{i+1}. {inst.get('description', '')}"
                    for i, inst in enumerate(instructions)
                ])
            else:
                instructions_text = "\n".join([
                    f"{i+1}. {inst}"
                    for i, inst in enumerate(instructions)
                ])
            
            response = self.llm.invoke(
                self.instructions_prompt.format(instructions=instructions_text)
            )
            
            # Parse JSON response
            cleaned_instructions = json.loads(response.content.strip())
            
            # Convert to our format
            formatted_instructions = []
            for inst in cleaned_instructions:
                formatted_instructions.append({
                    'description': inst['instruction'],
                    'order': inst['step'],
                    'timeframe': ''  # Could be extracted in the future
                })
            
            return formatted_instructions
            
        except Exception as e:
            print(f"Error cleaning instructions: {str(e)}")
            # Return original format
            if isinstance(instructions[0], dict):
                return instructions
            else:
                # Convert simple list to dict format
                return [
                    {'description': str(inst), 'order': i+1, 'timeframe': ''}
                    for i, inst in enumerate(instructions)
                ]