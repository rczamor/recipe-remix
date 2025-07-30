import os
import json
from typing import Dict, List, Optional, Any
from django.db import transaction
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor
try:
    from langchain.agents import create_react_agent
except ImportError:
    from langchain.agents import create_structured_chat_agent as create_react_agent
from langchain.tools import Tool, tool
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.utilities import SerpAPIWrapper
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from .models import Recipe, Ingredient, Instruction, ChatMessage
from .services import RecipeScrapingService, create_recipe_revision


class RecipeAssistant:
    def __init__(self, session_id: str, recipe_context: Optional[Recipe] = None):
        self.session_id = session_id
        self.recipe_context = recipe_context
        
        # Check for API keys
        xai_key = os.environ.get("XAI_API_KEY")
        serpapi_key = os.environ.get("SERPAPI_API_KEY")
        
        if not xai_key:
            raise ValueError("XAI_API_KEY environment variable is not set")
        
        # Initialize Grok using OpenAI client with X.AI base URL
        self.llm = ChatOpenAI(
            model="grok-2-1212",
            openai_api_key=xai_key,
            openai_api_base="https://api.x.ai/v1",
            temperature=0.7,
            streaming=True
        )
        
        # Initialize search wrapper if API key is available
        self.search = SerpAPIWrapper(serpapi_api_key=serpapi_key) if serpapi_key else None
        
        # Create tools
        self.tools = self._create_tools()
        
        # Initialize memory
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Load chat history
        self._load_chat_history()
        
        # Create the agent
        self.agent = self._create_agent()
    
    def _load_chat_history(self):
        """Load previous chat messages for this session"""
        messages = ChatMessage.objects.filter(
            session_id=self.session_id,
            recipe=self.recipe_context
        ).order_by('created_at')
        
        for msg in messages:
            if msg.role == 'user':
                self.memory.chat_memory.add_user_message(msg.content)
            elif msg.role == 'assistant':
                self.memory.chat_memory.add_ai_message(msg.content)
    
    def _create_tools(self) -> List[Tool]:
        """Create Langchain tools for recipe operations"""
        
        @tool
        def search_recipes_online(query: str) -> str:
            """Search for recipes online using SERPAPI"""
            if not self.search:
                return "Search functionality is not available. Please ensure SERPAPI_API_KEY is configured."
            try:
                results = self.search.run(f"{query} recipe")
                return f"Found these recipe results:\n{results}"
            except Exception as e:
                return f"Error searching: {str(e)}"
        
        @tool
        def create_recipe(recipe_data: str) -> str:
            """Create a new recipe from JSON data. 
            Format: {"title": "...", "description": "...", "ingredients": [{"name": "...", "quantity": "..."}], "instructions": [{"description": "..."}]}"""
            try:
                data = json.loads(recipe_data)
                
                with transaction.atomic():
                    # Create recipe
                    recipe = Recipe.objects.create(
                        title=data['title'],
                        description=data.get('description', ''),
                        prep_time_minutes=data.get('prep_time_minutes'),
                        cook_time_minutes=data.get('cook_time_minutes'),
                        servings=data.get('servings', 4),
                        difficulty=data.get('difficulty', 'medium'),
                        category=data.get('category', ''),
                        tags=data.get('tags', ''),
                        notes=data.get('notes', 'Created by AI Assistant')
                    )
                    
                    # Add ingredients
                    for i, ing in enumerate(data.get('ingredients', [])):
                        Ingredient.objects.create(
                            recipe=recipe,
                            name=ing['name'],
                            quantity=ing.get('quantity', ''),
                            order=i
                        )
                    
                    # Add instructions
                    for i, inst in enumerate(data.get('instructions', [])):
                        Instruction.objects.create(
                            recipe=recipe,
                            description=inst['description'],
                            order=i
                        )
                    
                    # Create initial revision
                    create_recipe_revision(recipe, "Initial creation by AI Assistant")
                
                return f"Successfully created recipe: {recipe.title} (ID: {recipe.id})"
            except Exception as e:
                return f"Error creating recipe: {str(e)}"
        
        @tool
        def clone_recipe(recipe_id: int, modifications: str) -> str:
            """Clone an existing recipe with modifications.
            Format modifications as: {"title": "New Title", "changes": "description of changes"}"""
            try:
                original = Recipe.objects.get(id=recipe_id)
                data = json.loads(modifications) if modifications else {}
                
                # Clone the recipe
                new_recipe = Recipe.objects.create(
                    title=data.get('title', f"Copy of {original.title}"),
                    description=original.description,
                    image_url=original.image_url,
                    prep_time_minutes=original.prep_time_minutes,
                    cook_time_minutes=original.cook_time_minutes,
                    servings=original.servings,
                    difficulty=original.difficulty,
                    category=original.category,
                    tags=original.tags,
                    notes=f"Cloned from '{original.title}' by AI Assistant. {data.get('changes', '')}",
                    is_cloned=True,
                    original_recipe=original
                )
                
                # Clone ingredients
                for ing in original.ingredients.all():
                    Ingredient.objects.create(
                        recipe=new_recipe,
                        name=ing.name,
                        quantity=ing.quantity,
                        brand=ing.brand,
                        price=ing.price,
                        order=ing.order
                    )
                
                # Clone instructions
                for inst in original.instructions.all():
                    Instruction.objects.create(
                        recipe=new_recipe,
                        description=inst.description,
                        timeframe=inst.timeframe,
                        order=inst.order
                    )
                
                # Create initial revision
                create_recipe_revision(new_recipe, f"Cloned from recipe {original.id} by AI Assistant")
                
                return f"Successfully cloned recipe: {new_recipe.title} (ID: {new_recipe.id})"
            except Recipe.DoesNotExist:
                return f"Recipe with ID {recipe_id} not found"
            except Exception as e:
                return f"Error cloning recipe: {str(e)}"
        
        @tool
        def create_shopping_list(ingredient_names: str) -> str:
            """Create a shopping list from comma-separated ingredient names"""
            try:
                names = [name.strip() for name in ingredient_names.split(',')]
                
                # Find ingredients from all recipes
                ingredients = Ingredient.objects.filter(name__in=names).values(
                    'name', 'quantity', 'price'
                ).distinct()
                
                shopping_list = []
                total_price = 0
                
                for ing in ingredients:
                    item = f"- {ing['quantity']} {ing['name']}"
                    if ing['price']:
                        item += f" (${ing['price']})"
                        total_price += float(ing['price'])
                    shopping_list.append(item)
                
                result = "Shopping List:\n" + "\n".join(shopping_list)
                if total_price > 0:
                    result += f"\n\nEstimated Total: ${total_price:.2f}"
                
                return result
            except Exception as e:
                return f"Error creating shopping list: {str(e)}"
        
        @tool
        def get_current_recipe_details() -> str:
            """Get details about the current recipe being viewed"""
            if not self.recipe_context:
                return "No recipe is currently being viewed"
            
            recipe = self.recipe_context
            ingredients = [f"{ing.quantity} {ing.name}" for ing in recipe.ingredients.all()]
            instructions = [f"{i+1}. {inst.description}" for i, inst in enumerate(recipe.instructions.all())]
            
            details = f"""
Recipe: {recipe.title}
Description: {recipe.description}
Prep Time: {recipe.prep_time_minutes} minutes
Cook Time: {recipe.cook_time_minutes} minutes
Servings: {recipe.servings}
Difficulty: {recipe.difficulty}

Ingredients:
{chr(10).join(ingredients)}

Instructions:
{chr(10).join(instructions)}
"""
            return details
        
        return [
            Tool(name="search_recipes_online", func=search_recipes_online, description="Search for recipes online"),
            Tool(name="create_recipe", func=create_recipe, description="Create a new recipe"),
            Tool(name="clone_recipe", func=clone_recipe, description="Clone an existing recipe"),
            Tool(name="create_shopping_list", func=create_shopping_list, description="Create a shopping list"),
            Tool(name="get_current_recipe_details", func=get_current_recipe_details, description="Get current recipe details"),
        ]
    
    def _create_agent(self) -> AgentExecutor:
        """Create the Langchain agent"""
        
        # Create a simple agent executor with tools
        # Using a more straightforward approach for better compatibility
        from langchain.agents import initialize_agent, AgentType
        
        return initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
            memory=self.memory,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=3,
            agent_kwargs={
                "system_message": """You are a helpful cooking assistant. You help users with recipe-related questions and tasks.
                
When on a recipe page, you have access to the recipe details through the get_current_recipe_details tool.
You can help users:
- Modify recipes and suggest alternatives
- Search for new recipes online
- Create new recipes
- Clone and modify existing recipes
- Create shopping lists
- Answer cooking questions

Be friendly, helpful, and provide practical cooking advice."""
            }
        )
    
    def chat(self, message: str) -> Dict[str, Any]:
        """Process a chat message and return the response"""
        try:
            # Save user message
            ChatMessage.objects.create(
                session_id=self.session_id,
                role='user',
                content=message,
                recipe=self.recipe_context
            )
            
            # Get response from agent
            response = self.agent.invoke({"input": message})
            ai_message = response['output']
            
            # Save AI response
            ChatMessage.objects.create(
                session_id=self.session_id,
                role='assistant',
                content=ai_message,
                recipe=self.recipe_context
            )
            
            return {
                'success': True,
                'message': ai_message
            }
            
        except Exception as e:
            error_msg = f"I encountered an error: {str(e)}"
            
            # Save error as AI message
            ChatMessage.objects.create(
                session_id=self.session_id,
                role='assistant',
                content=error_msg,
                recipe=self.recipe_context
            )
            
            return {
                'success': False,
                'message': error_msg
            }
    
    def get_chat_history(self) -> List[Dict[str, str]]:
        """Get the chat history for this session"""
        messages = ChatMessage.objects.filter(
            session_id=self.session_id,
            recipe=self.recipe_context
        ).order_by('created_at')
        
        return [
            {
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.created_at.isoformat()
            }
            for msg in messages
        ]