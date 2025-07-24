import { useState } from "react";
import { X, Copy, ShoppingCart, Star, Clock, ChefHat, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { RecipeWithDetails } from "@shared/schema";

interface RecipeDetailsModalProps {
  recipe: RecipeWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onClone: () => void;
  onAddToShoppingList: (ingredientIds: number[]) => void;
}

export default function RecipeDetailsModal({
  recipe,
  isOpen,
  onClose,
  onClone,
  onAddToShoppingList,
}: RecipeDetailsModalProps) {
  const [selectedIngredients, setSelectedIngredients] = useState<number[]>([]);
  const [userRating, setUserRating] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: (rating: number) => api.rateRecipe(recipe.id, rating),
    onSuccess: () => {
      toast({
        title: "Rating submitted",
        description: "Thank you for rating this recipe!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes", recipe.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleIngredientToggle = (ingredientId: number, checked: boolean) => {
    setSelectedIngredients(prev =>
      checked
        ? [...prev, ingredientId]
        : prev.filter(id => id !== ingredientId)
    );
  };

  const handleAddToShoppingList = () => {
    if (selectedIngredients.length === 0) {
      toast({
        title: "No ingredients selected",
        description: "Please select ingredients to add to your shopping list.",
        variant: "destructive",
      });
      return;
    }
    
    onAddToShoppingList(selectedIngredients);
    toast({
      title: "Added to shopping list",
      description: `${selectedIngredients.length} ingredients added to your shopping list.`,
    });
  };

  const handleRating = (rating: number) => {
    setUserRating(rating);
    rateMutation.mutate(rating);
  };

  const renderStars = (currentRating: number, interactive = false) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 cursor-pointer transition-colors ${
          i < currentRating
            ? "text-yellow-500 fill-current"
            : "text-yellow-500"
        } ${interactive ? "hover:text-yellow-600" : ""}`}
        onClick={interactive ? () => handleRating(i + 1) : undefined}
      />
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        {/* Recipe Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">{recipe.title}</h2>
            <div className="flex items-center space-x-6 text-gray-600">
              <div className="flex items-center">
                <div className="flex mr-2">
                  {renderStars(parseFloat(recipe.averageRating || "0"))}
                </div>
                <span>{parseFloat(recipe.averageRating || "0").toFixed(1)} ({recipe.ratingCount} reviews)</span>
              </div>
              {recipe.prepTimeMinutes && (
                <span>
                  <Clock className="w-4 h-4 mr-1 inline" />
                  Prep: {recipe.prepTimeMinutes} min
                </span>
              )}
              {recipe.cookTimeMinutes && (
                <span>
                  <ChefHat className="w-4 h-4 mr-1 inline" />
                  Cook: {recipe.cookTimeMinutes} min
                </span>
              )}
              {recipe.servings && (
                <span>
                  <Users className="w-4 h-4 mr-1 inline" />
                  Serves {recipe.servings}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recipe Image and Actions */}
          <div className="lg:col-span-1">
            <img
              src={recipe.imageUrl || "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=400&fit=crop"}
              alt={recipe.title}
              className="w-full h-64 lg:h-80 object-cover rounded-lg mb-4"
            />

            <div className="space-y-3">
              <Button onClick={onClone} className="w-full btn-primary">
                <Copy className="w-4 h-4 mr-2" />
                Clone & Modify Recipe
              </Button>
              <Button onClick={handleAddToShoppingList} className="w-full btn-accent">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Shopping List
              </Button>
              <div className="text-center pt-2">
                <span className="text-sm text-gray-600">Rate this recipe:</span>
                <div className="flex justify-center space-x-1 mt-1">
                  {renderStars(userRating, true)}
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients and Instructions */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Ingredients */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Ingredients</h3>
                <div className="space-y-3">
                  {recipe.ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="ingredient-item">
                      <Checkbox
                        checked={selectedIngredients.includes(ingredient.id)}
                        onCheckedChange={(checked) =>
                          handleIngredientToggle(ingredient.id, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <span className="font-medium">{ingredient.quantity}</span>
                        <span className="ml-1">{ingredient.name}</span>
                        {(ingredient.brand || ingredient.price) && (
                          <div className="text-sm text-gray-600">
                            {ingredient.brand && <span>{ingredient.brand}</span>}
                            {ingredient.brand && ingredient.price && <span className="mx-1">•</span>}
                            {ingredient.price && <span>${ingredient.price}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Instructions</h3>
                <div className="space-y-4">
                  {recipe.instructions.map((instruction, index) => (
                    <div key={instruction.id} className="instruction-step">
                      <div className="step-number">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-800">{instruction.description}</p>
                        {instruction.timeframe && (
                          <span className="text-sm text-gray-600">{instruction.timeframe}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
