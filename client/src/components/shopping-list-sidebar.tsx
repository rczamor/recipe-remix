import { useState, useEffect } from "react";
import { X, Trash2, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Ingredient } from "@shared/schema";

interface ShoppingListSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  ingredientIds: number[];
  onRemoveItem: (id: number) => void;
}

export default function ShoppingListSidebar({
  isOpen,
  onClose,
  ingredientIds,
  onRemoveItem,
}: ShoppingListSidebarProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const { data: shoppingItems = [], isLoading } = useQuery({
    queryKey: ["/api/shopping-list", ingredientIds],
    queryFn: () => api.getShoppingListItems(ingredientIds),
    enabled: ingredientIds.length > 0,
  });

  const handleItemCheck = (itemId: number, checked: boolean) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const totalCost = shoppingItems.reduce((sum, item) => {
    const price = parseFloat(item.price || "0");
    return sum + price;
  }, 0);

  const exportShoppingList = () => {
    const listText = shoppingItems
      .map(item => `• ${item.quantity} ${item.name}${item.brand ? ` (${item.brand})` : ""}${item.price ? ` - $${item.price}` : ""}`)
      .join("\n");
    
    const fullText = `Shopping List\n\n${listText}\n\nTotal Estimated Cost: $${totalCost.toFixed(2)}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Recipe Shopping List",
        text: fullText,
      });
    } else {
      navigator.clipboard.writeText(fullText);
      // Could show a toast here
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Shopping List</h3>
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto h-full pb-32">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : shoppingItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No items in your shopping list</p>
              <p className="text-sm mt-2">Add ingredients from recipes to get started</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {shoppingItems.map((item) => (
                  <div key={item.id} className="shopping-list-item">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={checkedItems.has(item.id)}
                        onCheckedChange={(checked) => handleItemCheck(item.id, checked as boolean)}
                      />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          <span>{item.quantity}</span>
                          {item.brand && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{item.brand}</span>
                            </>
                          )}
                          {item.price && (
                            <>
                              <span className="mx-1">•</span>
                              <span>${item.price}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Total Estimated Cost:</span>
                  <span className="font-bold text-primary text-lg">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
                <Button onClick={exportShoppingList} className="w-full btn-accent">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Shopping List
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
