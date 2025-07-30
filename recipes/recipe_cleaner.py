"""
Recipe cleaning service using Langchain and Grok LLM
Cleans and standardizes scraped recipe data before saving
"""
import json
from typing import Dict, List, Any
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from langchain.prompts import ChatPromptTemplate
import os


class RecipeCleaner:
    """Clean and standardize recipe data using LLM"""
    
    def __init__(self):
        # Use the existing Grok LLM setup
        self.llm = ChatOpenAI(
            base_url="https://api.x.ai/v1",
            api_key=os.environ.get('XAI_API_KEY'),
            model="grok-2-1212",
            temperature=0.3,  # Lower temperature for consistent cleaning
            max_tokens=2000
        )
        
        # System prompt for recipe cleaning
        self.system_prompt = """You are a recipe data cleaning assistant. Your job is to:
1. Fix spelling and grammar errors
2. Standardize ingredient formats (e.g., "1 tsp" instead of "1 teaspoon")
3. Make instructions clear and concise
4. Remove any promotional content or irrelevant information
5. Ensure quantities are properly formatted

Return cleaned data in the exact same JSON structure as provided.
Do not add or remove fields, only clean the existing content."""

    def clean_recipe(self, recipe_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean all aspects of a recipe"""
        try:
            # Create the cleaning prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", self.system_prompt),
                ("human", """Please clean this recipe data:

{recipe_json}

Return the cleaned recipe in the same JSON format with these fields:
- title: cleaned title
- description: cleaned description (1-2 sentences max)
- ingredients: array of cleaned ingredients with quantity, name, and order
- instructions: array of cleaned instructions with description and order
- prep_time_minutes: number or null
- cook_time_minutes: number or null
- servings: number or null""")
            ])
            
            # Format the recipe for cleaning
            recipe_json = json.dumps({
                'title': recipe_data.get('title', ''),
                'description': recipe_data.get('description', ''),
                'ingredients': recipe_data.get('ingredients', []),
                'instructions': recipe_data.get('instructions', []),
                'prep_time_minutes': recipe_data.get('prep_time_minutes'),
                'cook_time_minutes': recipe_data.get('cook_time_minutes'),
                'servings': recipe_data.get('servings')
            }, indent=2)
            
            # Get cleaned data from LLM
            messages = prompt.format_messages(recipe_json=recipe_json)
            response = self.llm.invoke(messages)
            
            # Parse the cleaned data
            cleaned_data = json.loads(response.content)
            
            # Merge with original data (preserve URLs and other fields)
            result = recipe_data.copy()
            result.update(cleaned_data)
            
            return result
            
        except Exception as e:
            print(f"Error cleaning recipe: {str(e)}")
            # Return original data if cleaning fails
            return recipe_data
    
    def clean_description(self, description: str) -> str:
        """Clean just the description"""
        try:
            prompt = f"Clean and summarize this recipe description in 1-2 sentences, fixing any errors: {description}"
            response = self.llm.invoke([HumanMessage(content=prompt)])
            return response.content.strip()
        except:
            return description
    
    def clean_ingredients(self, ingredients: List[Dict]) -> List[Dict]:
        """Clean and standardize ingredients list"""
        try:
            prompt = f"""Standardize these ingredients (fix spelling, use abbreviations like tsp/tbsp/oz/lb):
{json.dumps(ingredients, indent=2)}

Return as JSON array with same structure."""
            
            response = self.llm.invoke([
                SystemMessage(content="You standardize recipe ingredients. Return valid JSON only."),
                HumanMessage(content=prompt)
            ])
            
            return json.loads(response.content)
        except:
            return ingredients
    
    def clean_instructions(self, instructions: List[Dict]) -> List[Dict]:
        """Clean and clarify instructions"""
        try:
            prompt = f"""Make these cooking instructions clear and concise, fixing any errors:
{json.dumps(instructions, indent=2)}

Return as JSON array with same structure."""
            
            response = self.llm.invoke([
                SystemMessage(content="You clarify cooking instructions. Return valid JSON only."),
                HumanMessage(content=prompt)
            ])
            
            return json.loads(response.content)
        except:
            return instructions