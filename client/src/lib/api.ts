import { apiRequest } from "./queryClient";
import type { Recipe, RecipeWithDetails, ScrapedRecipeData } from "@shared/schema";

export const api = {
  // Get all recipes
  getRecipes: async (): Promise<Recipe[]> => {
    const response = await apiRequest("GET", "/api/recipes");
    return response.json();
  },

  // Search recipes
  searchRecipes: async (query: string): Promise<Recipe[]> => {
    const response = await apiRequest("GET", `/api/recipes/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  // Get recipe by ID
  getRecipe: async (id: number): Promise<RecipeWithDetails> => {
    const response = await apiRequest("GET", `/api/recipes/${id}`);
    return response.json();
  },

  // Scrape recipe from URL
  scrapeRecipe: async (url: string): Promise<RecipeWithDetails> => {
    const response = await apiRequest("POST", "/api/recipes/scrape", { url });
    return response.json();
  },

  // Clone recipe
  cloneRecipe: async (id: number, data: any): Promise<RecipeWithDetails> => {
    const response = await apiRequest("POST", `/api/recipes/${id}/clone`, data);
    return response.json();
  },

  // Update recipe
  updateRecipe: async (id: number, data: any): Promise<RecipeWithDetails> => {
    const response = await apiRequest("PATCH", `/api/recipes/${id}`, data);
    return response.json();
  },

  // Rate recipe
  rateRecipe: async (id: number, rating: number) => {
    const response = await apiRequest("POST", `/api/recipes/${id}/rate`, { rating });
    return response.json();
  },

  // Get shopping list items
  getShoppingListItems: async (ingredientIds: number[]) => {
    const response = await apiRequest("POST", "/api/shopping-list", { ingredientIds });
    return response.json();
  },
};
