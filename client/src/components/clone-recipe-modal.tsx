import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CloneRecipeModalProps {
  recipeId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface IngredientForm {
  name: string;
  quantity: string;
  brand?: string;
  price?: string;
}

interface InstructionForm {
  description: string;
  timeframe?: string;
}

export default function CloneRecipeModal({ recipeId, isOpen, onClose }: CloneRecipeModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState<number | "">("");
  const [cookTime, setCookTime] = useState<number | "">("");
  const [servings, setServings] = useState<number | "">("");
  const [ingredients, setIngredients] = useState<IngredientForm[]>([]);
  const [instructions, setInstructions] = useState<InstructionForm[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: originalRecipe } = useQuery({
    queryKey: ["/api/recipes", recipeId],
    queryFn: () => api.getRecipe(recipeId),
    enabled: isOpen && !!recipeId,
  });

  const cloneMutation = useMutation({
    mutationFn: (data: any) => api.cloneRecipe(recipeId, data),
    onSuccess: () => {
      toast({
        title: "Recipe cloned successfully!",
        description: "Your modified recipe has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clone recipe",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (originalRecipe) {
      setTitle(`${originalRecipe.title} (My Version)`);
      setDescription(originalRecipe.description || "");
      setPrepTime(originalRecipe.prepTimeMinutes || "");
      setCookTime(originalRecipe.cookTimeMinutes || "");
      setServings(originalRecipe.servings || "");
      
      setIngredients(
        originalRecipe.ingredients.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          brand: ing.brand || "",
          price: ing.price || "",
        }))
      );
      
      setInstructions(
        originalRecipe.instructions.map(inst => ({
          description: inst.description,
          timeframe: inst.timeframe || "",
        }))
      );
    }
  }, [originalRecipe]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a recipe title",
        variant: "destructive",
      });
      return;
    }

    if (ingredients.length === 0) {
      toast({
        title: "Ingredients required",
        description: "Please add at least one ingredient",
        variant: "destructive",
      });
      return;
    }

    if (instructions.length === 0) {
      toast({
        title: "Instructions required",
        description: "Please add at least one instruction",
        variant: "destructive",
      });
      return;
    }

    cloneMutation.mutate({
      title,
      description,
      prepTimeMinutes: prepTime || undefined,
      cookTimeMinutes: cookTime || undefined,
      servings: servings || undefined,
      ingredients: ingredients.filter(ing => ing.name.trim()),
      instructions: instructions.filter(inst => inst.description.trim()),
    });
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", quantity: "" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof IngredientForm, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, { description: "" }]);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const updateInstruction = (index: number, field: keyof InstructionForm, value: string) => {
    const updated = [...instructions];
    updated[index] = { ...updated[index], [field]: value };
    setInstructions(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Clone & Modify Recipe</h3>
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Recipe Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter recipe name"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the recipe"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="prep-time">Prep Time (minutes)</Label>
              <Input
                id="prep-time"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="15"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="cook-time">Cook Time (minutes)</Label>
              <Input
                id="cook-time"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="30"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="4"
                min="1"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>Ingredients</Label>
              <Button type="button" onClick={addIngredient} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Ingredient
              </Button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="Quantity"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                    className="w-24"
                  />
                  <Input
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>Instructions</Label>
              <Button type="button" onClick={addInstruction} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
            <div className="space-y-3">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="step-number mt-2">{index + 1}</div>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Instruction description"
                      value={instruction.description}
                      onChange={(e) => updateInstruction(index, "description", e.target.value)}
                      rows={2}
                    />
                    <Input
                      placeholder="Time (optional)"
                      value={instruction.timeframe || ""}
                      onChange={(e) => updateInstruction(index, "timeframe", e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 mt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              type="submit"
              className="flex-1 btn-primary"
              disabled={cloneMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Recipe
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
