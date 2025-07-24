from django.urls import path
from . import views

urlpatterns = [
    # API endpoints
    path('api/recipes/', views.get_recipes, name='get_recipes'),
    path('api/recipes/create/', views.create_recipe, name='create_recipe'),
    path('api/recipes/search/', views.get_recipes, name='search_recipes'),  # Uses same view with query param
    path('api/recipes/<int:recipe_id>/', views.get_recipe, name='get_recipe'),
    path('api/recipes/<int:recipe_id>/update/', views.update_recipe, name='update_recipe'),
    path('api/recipes/<int:recipe_id>/delete/', views.delete_recipe, name='delete_recipe'),
    path('api/recipes/scrape/', views.scrape_recipe, name='scrape_recipe'),
    path('api/recipes/<int:recipe_id>/clone/', views.clone_recipe, name='clone_recipe'),
    path('api/recipes/<int:recipe_id>/rate/', views.rate_recipe, name='rate_recipe'),
    path('api/shopping-list/', views.get_shopping_list, name='get_shopping_list'),
    
    # Main app page
    path('', views.home, name='home'),
]