import { useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddRecipeModal({ isOpen, onClose }: AddRecipeModalProps) {
  const [url, setUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scrapeMutation = useMutation({
    mutationFn: (recipeUrl: string) => api.scrapeRecipe(recipeUrl),
    onSuccess: () => {
      toast({
        title: "Recipe imported successfully!",
        description: "Your recipe has been added to your collection.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setUrl("");
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to scrape recipe. Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a recipe URL",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    scrapeMutation.mutate(url);
  };

  const handleClose = () => {
    if (!scrapeMutation.isPending) {
      setUrl("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Add New Recipe</h3>
          {!scrapeMutation.isPending && (
            <Button variant="ghost" onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {scrapeMutation.isPending ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-600">Importing recipe...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="recipe-url" className="block text-sm font-medium text-gray-700 mb-2">
                Recipe URL
              </Label>
              <Input
                id="recipe-url"
                type="url"
                placeholder="https://example.com/recipe"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full"
                required
              />
              <p className="text-sm text-gray-600 mt-1">Paste a URL from any recipe website</p>
            </div>

            <div className="flex space-x-3">
              <Button type="submit" className="flex-1 btn-primary">
                <Download className="w-4 h-4 mr-2" />
                Import Recipe
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
