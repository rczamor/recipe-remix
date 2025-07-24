import json
from decimal import Decimal
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Avg, Count
from django.db import transaction
from .models import Recipe, Ingredient, Instruction, Rating
from .services import RecipeScrapingService


def home(request):
    """Serve the main application page"""
    return render(request, 'recipes/index.html')


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
    """Scrape and create a recipe from URL"""
    try:
        data = json.loads(request.body)
        url = data.get('url')
        
        if not url:
            return JsonResponse({'error': 'URL is required'}, status=400)
        
        # Validate URL format
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return JsonResponse({'error': 'Invalid URL format'}, status=400)
        
        # Scrape recipe data
        scraper = RecipeScrapingService()
        scraped_data = scraper.scrape_recipe(url)
        
        # Create recipe in database
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
        
        # Return complete recipe data
        return get_recipe(request, recipe.id)
        
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
        
        # Return complete cloned recipe data
        return get_recipe(request, cloned_recipe.id)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["PATCH"])
def update_recipe(request, recipe_id):
    """Update a recipe"""
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
        
        # Return updated recipe data
        return get_recipe(request, recipe.id)
        
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
