import { Clock, Users, Star, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@shared/schema";

interface RecipeCardProps {
  recipe: Recipe;
  onView: () => void;
  onClone: () => void;
}

export default function RecipeCard({ recipe, onView, onClone }: RecipeCardProps) {
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < fullStars
            ? "text-yellow-500 fill-current"
            : i === fullStars && hasHalfStar
            ? "text-yellow-500 fill-current"
            : "text-yellow-500"
        }`}
      />
    ));
  };

  return (
    <div className="recipe-card cursor-pointer" onClick={onView}>
      <img
        src={recipe.imageUrl || "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop"}
        alt={recipe.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recipe.title}</h3>
        
        <div className="flex items-center mb-2">
          <div className="flex mr-2">
            {renderStars(parseFloat(recipe.averageRating || "0"))}
          </div>
          <span className="text-sm text-gray-600">
            {parseFloat(recipe.averageRating || "0").toFixed(1)} ({recipe.ratingCount} reviews)
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <span>
            <Clock className="w-4 h-4 mr-1 inline" />
            {totalTime > 0 ? `${totalTime} min` : "Time varies"}
          </span>
          <span>
            <Users className="w-4 h-4 mr-1 inline" />
            {recipe.servings ? `${recipe.servings} servings` : "Serves varies"}
          </span>
        </div>
        
        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={onView}
            className="flex-1 btn-primary text-sm py-2 px-3"
          >
            View Recipe
          </Button>
          <Button
            onClick={onClone}
            variant="outline"
            className="bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 px-3"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
