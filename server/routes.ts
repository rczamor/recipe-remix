import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRecipeSchema, insertRatingSchema, type ScrapedRecipeData } from "@shared/schema";
import { scrapeRecipe } from "./services/recipeScrapingService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all recipes
  app.get("/api/recipes", async (req, res) => {
    try {
      const recipes = await storage.getRecipes();
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  // Search recipes
  app.get("/api/recipes/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const recipes = await storage.searchRecipes(query);
      res.json(recipes);
    } catch (error) {
      console.error("Error searching recipes:", error);
      res.status(500).json({ message: "Failed to search recipes" });
    }
  });

  // Get recipe by ID
  app.get("/api/recipes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recipe ID" });
      }

      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  // Scrape and create recipe from URL
  app.post("/api/recipes/scrape", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      const scrapedData = await scrapeRecipe(url);
      
      // Create recipe
      const recipe = await storage.createRecipe({
        title: scrapedData.title,
        description: scrapedData.description,
        imageUrl: scrapedData.imageUrl,
        sourceUrl: url,
        prepTimeMinutes: scrapedData.prepTimeMinutes,
        cookTimeMinutes: scrapedData.cookTimeMinutes,
        servings: scrapedData.servings,
      });

      // Create ingredients
      const ingredientsData = scrapedData.ingredients.map((ingredient, index) => ({
        recipeId: recipe.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        brand: ingredient.brand,
        price: ingredient.price,
        order: index + 1,
      }));
      
      const createdIngredients = await storage.createIngredients(ingredientsData);

      // Create instructions
      const instructionsData = scrapedData.instructions.map((instruction, index) => ({
        recipeId: recipe.id,
        description: instruction.description,
        timeframe: instruction.timeframe,
        order: index + 1,
      }));
      
      const createdInstructions = await storage.createInstructions(instructionsData);

      res.json({
        ...recipe,
        ingredients: createdIngredients,
        instructions: createdInstructions,
      });
    } catch (error) {
      console.error("Error scraping recipe:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to scrape recipe" 
      });
    }
  });

  // Clone recipe
  app.post("/api/recipes/:id/clone", async (req, res) => {
    try {
      const originalId = parseInt(req.params.id);
      if (isNaN(originalId)) {
        return res.status(400).json({ message: "Invalid recipe ID" });
      }

      const originalRecipe = await storage.getRecipe(originalId);
      if (!originalRecipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      const cloneData = req.body;
      
      // Create cloned recipe
      const clonedRecipe = await storage.createRecipe({
        title: cloneData.title || `${originalRecipe.title} (Copy)`,
        description: cloneData.description || originalRecipe.description,
        imageUrl: originalRecipe.imageUrl,
        sourceUrl: originalRecipe.sourceUrl,
        prepTimeMinutes: cloneData.prepTimeMinutes || originalRecipe.prepTimeMinutes,
        cookTimeMinutes: cloneData.cookTimeMinutes || originalRecipe.cookTimeMinutes,
        servings: cloneData.servings || originalRecipe.servings,
        isCloned: true,
        originalRecipeId: originalId,
      });

      // Create ingredients for cloned recipe
      const ingredientsData = (cloneData.ingredients || originalRecipe.ingredients).map((ingredient: any, index: number) => ({
        recipeId: clonedRecipe.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        brand: ingredient.brand,
        price: ingredient.price,
        order: index + 1,
      }));
      
      const createdIngredients = await storage.createIngredients(ingredientsData);

      // Create instructions for cloned recipe
      const instructionsData = (cloneData.instructions || originalRecipe.instructions).map((instruction: any, index: number) => ({
        recipeId: clonedRecipe.id,
        description: instruction.description,
        timeframe: instruction.timeframe,
        order: index + 1,
      }));
      
      const createdInstructions = await storage.createInstructions(instructionsData);

      res.json({
        ...clonedRecipe,
        ingredients: createdIngredients,
        instructions: createdInstructions,
      });
    } catch (error) {
      console.error("Error cloning recipe:", error);
      res.status(500).json({ message: "Failed to clone recipe" });
    }
  });

  // Update recipe
  app.patch("/api/recipes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recipe ID" });
      }

      const updateData = req.body;
      
      // Update recipe
      const recipe = await storage.updateRecipe(id, {
        title: updateData.title,
        description: updateData.description,
        prepTimeMinutes: updateData.prepTimeMinutes,
        cookTimeMinutes: updateData.cookTimeMinutes,
        servings: updateData.servings,
      });

      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      // Update ingredients if provided
      if (updateData.ingredients) {
        const ingredientsData = updateData.ingredients.map((ingredient: any, index: number) => ({
          recipeId: id,
          name: ingredient.name,
          quantity: ingredient.quantity,
          brand: ingredient.brand,
          price: ingredient.price,
          order: index + 1,
        }));
        
        await storage.updateIngredients(id, ingredientsData);
      }

      // Update instructions if provided
      if (updateData.instructions) {
        const instructionsData = updateData.instructions.map((instruction: any, index: number) => ({
          recipeId: id,
          description: instruction.description,
          timeframe: instruction.timeframe,
          order: index + 1,
        }));
        
        await storage.updateInstructions(id, instructionsData);
      }

      // Get updated recipe with details
      const updatedRecipe = await storage.getRecipe(id);
      res.json(updatedRecipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  // Rate recipe
  app.post("/api/recipes/:id/rate", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        return res.status(400).json({ message: "Invalid recipe ID" });
      }

      const ratingData = insertRatingSchema.parse({
        ...req.body,
        recipeId,
        sessionId: req.sessionID || `anonymous-${Date.now()}`,
      });

      const rating = await storage.addRating(ratingData);
      res.json(rating);
    } catch (error) {
      console.error("Error rating recipe:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rating data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to rate recipe" });
    }
  });

  // Get shopping list items
  app.post("/api/shopping-list", async (req, res) => {
    try {
      const { ingredientIds } = req.body;
      if (!Array.isArray(ingredientIds)) {
        return res.status(400).json({ message: "ingredientIds must be an array" });
      }

      const items = await storage.getShoppingListItems(ingredientIds);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shopping list items:", error);
      res.status(500).json({ message: "Failed to fetch shopping list items" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
