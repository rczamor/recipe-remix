import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import AppHeader from "@/components/app-header";
import RecipeCard from "@/components/recipe-card";
import RecipeDetailsModal from "@/components/recipe-details-modal";
import AddRecipeModal from "@/components/add-recipe-modal";
import CloneRecipeModal from "@/components/clone-recipe-modal";
import ShoppingListSidebar from "@/components/shopping-list-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Star, Calendar } from "lucide-react";
import type { Recipe, RecipeWithDetails } from "@shared/schema";

export default function Home() {
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [cloneRecipeId, setCloneRecipeId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shoppingListItems, setShoppingListItems] = useState<number[]>([]);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["/api/recipes"],
    queryFn: () => searchQuery ? api.searchRecipes(searchQuery) : api.getRecipes(),
  });

  const { data: selectedRecipe } = useQuery({
    queryKey: ["/api/recipes", selectedRecipeId],
    queryFn: () => selectedRecipeId ? api.getRecipe(selectedRecipeId) : null,
    enabled: !!selectedRecipeId,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleRecipeClick = (recipeId: number) => {
    setSelectedRecipeId(recipeId);
  };

  const handleCloneRecipe = (recipeId: number) => {
    setSelectedRecipeId(null);
    setCloneRecipeId(recipeId);
  };

  const handleAddToShoppingList = (ingredientIds: number[]) => {
    setShoppingListItems(prev => [...new Set([...prev, ...ingredientIds])]);
    setShowShoppingList(true);
  };

  const filterHighRated = () => {
    setSearchQuery("");
    // This would need server-side filtering implementation
  };

  const filterQuickMeals = () => {
    setSearchQuery("");
    // This would need server-side filtering implementation
  };

  const showRecentlyAdded = () => {
    setSearchQuery("");
    // This would show most recent recipes (already default sort)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        onSearch={handleSearch}
        searchQuery={searchQuery}
        onAddRecipe={() => setShowAddModal(true)}
        onToggleShoppingList={() => setShowShoppingList(!showShoppingList)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 mb-6">
            <Button
              variant="outline"
              onClick={filterHighRated}
              className="border-gray-300 hover:bg-gray-50"
            >
              <Star className="w-4 h-4 mr-2 text-yellow-500" />
              Highly Rated
            </Button>
            <Button
              variant="outline"
              onClick={filterQuickMeals}
              className="border-gray-300 hover:bg-gray-50"
            >
              <Clock className="w-4 h-4 mr-2 text-primary" />
              Quick Meals
            </Button>
            <Button
              variant="outline"
              onClick={showRecentlyAdded}
              className="border-gray-300 hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 mr-2 text-accent" />
              Recently Added
            </Button>
          </div>
        </div>

        {/* Recipe Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                <Skeleton className="w-full h-48" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onView={() => handleRecipeClick(recipe.id)}
                onClone={() => handleCloneRecipe(recipe.id)}
              />
            ))}
          </div>
        )}

        {!isLoading && recipes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              {searchQuery ? "No recipes found matching your search." : "No recipes yet."}
            </p>
            <Button onClick={() => setShowAddModal(true)} className="btn-primary">
              Add Your First Recipe
            </Button>
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedRecipe && (
        <RecipeDetailsModal
          recipe={selectedRecipe}
          isOpen={!!selectedRecipeId}
          onClose={() => setSelectedRecipeId(null)}
          onClone={() => handleCloneRecipe(selectedRecipe.id)}
          onAddToShoppingList={handleAddToShoppingList}
        />
      )}

      <AddRecipeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {cloneRecipeId && (
        <CloneRecipeModal
          recipeId={cloneRecipeId}
          isOpen={!!cloneRecipeId}
          onClose={() => setCloneRecipeId(null)}
        />
      )}

      <ShoppingListSidebar
        isOpen={showShoppingList}
        onClose={() => setShowShoppingList(false)}
        ingredientIds={shoppingListItems}
        onRemoveItem={(id) => setShoppingListItems(prev => prev.filter(item => item !== id))}
      />
    </div>
  );
}
