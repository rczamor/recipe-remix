from django.urls import path
from . import views

urlpatterns = [
    # API endpoints
    path('api/recipes/', views.get_recipes, name='get_recipes'),
    path('api/recipes/create/', views.create_recipe, name='create_recipe'),
    path('api/recipes/scrape/', views.scrape_recipe, name='scrape_recipe'),
    path('api/recipes/search/', views.get_recipes, name='search_recipes'),  # Uses same view with query param
    # More specific patterns first
    path('api/recipes/<int:recipe_id>/update/', views.update_recipe, name='update_recipe'),
    path('api/recipes/<int:recipe_id>/delete/', views.delete_recipe, name='delete_recipe'),
    path('api/recipes/<int:recipe_id>/clone/', views.clone_recipe, name='clone_recipe'),
    path('api/recipes/<int:recipe_id>/rate/', views.rate_recipe, name='rate_recipe'),
    path('api/recipes/<int:recipe_id>/revisions/', views.get_recipe_revisions, name='get_recipe_revisions'),
    path('api/recipes/<int:recipe_id>/revisions/<int:revision_number>/', views.get_revision_details, name='get_revision_details'),
    # Generic pattern last
    path('api/recipes/<int:recipe_id>/', views.get_recipe, name='get_recipe'),
    path('api/shopping-list/', views.get_shopping_list, name='get_shopping_list'),
    
    # Chat API endpoints
    path('api/chat/message/', views.chat_message, name='chat_message'),
    path('api/chat/history/', views.chat_history, name='chat_history'),
    path('api/chat/clear/', views.clear_chat, name='clear_chat'),
    
    # Meal Planning API endpoints
    path('api/meal-plan/add/', views.add_to_meal_plan, name='add_to_meal_plan'),
    path('api/meal-plan/<int:meal_plan_id>/remove/', views.remove_from_meal_plan, name='remove_from_meal_plan'),
    path('api/meal-plan/week/', views.get_week_meal_plan, name='get_week_meal_plan'),
    path('api/meal-plan/save/', views.save_meal_plan, name='save_meal_plan'),
    path('api/shopping-list/generate/', views.generate_shopping_list, name='generate_shopping_list'),
    path('api/shopping-lists/', views.get_shopping_lists, name='get_shopping_lists'),
    path('api/shopping-list/item/<int:item_id>/', views.update_shopping_item, name='update_shopping_item'),
    
    # Recipe Cleaning Feedback API endpoints
    path('api/recipes/<int:recipe_id>/feedback/', views.submit_cleaning_feedback, name='submit_cleaning_feedback'),
    path('api/cleaning/stats/', views.get_cleaning_stats, name='get_cleaning_stats'),
    
    # Main app page
    path('', views.home, name='home'),
    path('recipe/<int:recipe_id>/', views.recipe_detail, name='recipe_detail'),
    path('recipe/<int:recipe_id>/edit/', views.recipe_edit, name='recipe_edit'),
]