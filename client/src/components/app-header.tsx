import { Search, Plus, ShoppingCart, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AppHeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onAddRecipe: () => void;
  onToggleShoppingList: () => void;
}

export default function AppHeader({
  onSearch,
  searchQuery,
  onAddRecipe,
  onToggleShoppingList,
}: AppHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Utensils className="text-primary text-2xl" />
            <h1 className="text-xl font-bold text-gray-900">Family Recipes</h1>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button onClick={onAddRecipe} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
            <Button
              variant="ghost"
              onClick={onToggleShoppingList}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              <ShoppingCart className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
