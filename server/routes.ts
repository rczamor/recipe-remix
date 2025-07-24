import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { insertRecipeSchema, insertIngredientSchema, insertInstructionSchema, insertRatingSchema } from "@shared/schema";
import { scrapeRecipe } from "./scraper";

const router = Router();

// Recipe routes
router.get("/api/recipes", async (req, res) => {
  try {
    const search = req.query.search as string;
    const recipes = await storage.getRecipes(search);
    res.json(recipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

router.get("/api/recipes/:id", async (req, res) => {
  try {
    const recipe = await storage.getRecipe(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(recipe);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
});

router.post("/api/recipes", async (req, res) => {
  try {
    const recipeData = insertRecipeSchema.parse(req.body);
    const recipe = await storage.createRecipe(recipeData);
    res.status(201).json(recipe);
  } catch (error) {
    console.error("Error creating recipe:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid recipe data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create recipe" });
  }
});

router.put("/api/recipes/:id", async (req, res) => {
  try {
    const updates = insertRecipeSchema.partial().parse(req.body);
    const recipe = await storage.updateRecipe(req.params.id, updates);
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(recipe);
  } catch (error) {
    console.error("Error updating recipe:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid recipe data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update recipe" });
  }
});

router.delete("/api/recipes/:id", async (req, res) => {
  try {
    const success = await storage.deleteRecipe(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

router.post("/api/recipes/:id/clone", async (req, res) => {
  try {
    const clonedRecipe = await storage.cloneRecipe(req.params.id);
    if (!clonedRecipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.status(201).json(clonedRecipe);
  } catch (error) {
    console.error("Error cloning recipe:", error);
    res.status(500).json({ error: "Failed to clone recipe" });
  }
});

// Recipe scraping
router.post("/api/recipes/scrape", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    const scrapedData = await scrapeRecipe(url);
    res.json(scrapedData);
  } catch (error) {
    console.error("Error scraping recipe:", error);
    res.status(500).json({ error: "Failed to scrape recipe" });
  }
});

// Ingredient routes
router.post("/api/ingredients", async (req, res) => {
  try {
    const ingredientData = insertIngredientSchema.parse(req.body);
    const ingredient = await storage.createIngredient(ingredientData);
    res.status(201).json(ingredient);
  } catch (error) {
    console.error("Error creating ingredient:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid ingredient data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create ingredient" });
  }
});

router.put("/api/ingredients/:id", async (req, res) => {
  try {
    const updates = insertIngredientSchema.partial().parse(req.body);
    const ingredient = await storage.updateIngredient(req.params.id, updates);
    if (!ingredient) {
      return res.status(404).json({ error: "Ingredient not found" });
    }
    res.json(ingredient);
  } catch (error) {
    console.error("Error updating ingredient:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid ingredient data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update ingredient" });
  }
});

router.delete("/api/ingredients/:id", async (req, res) => {
  try {
    const success = await storage.deleteIngredient(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Ingredient not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    res.status(500).json({ error: "Failed to delete ingredient" });
  }
});

// Instruction routes
router.post("/api/instructions", async (req, res) => {
  try {
    const instructionData = insertInstructionSchema.parse(req.body);
    const instruction = await storage.createInstruction(instructionData);
    res.status(201).json(instruction);
  } catch (error) {
    console.error("Error creating instruction:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid instruction data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create instruction" });
  }
});

router.put("/api/instructions/:id", async (req, res) => {
  try {
    const updates = insertInstructionSchema.partial().parse(req.body);
    const instruction = await storage.updateInstruction(req.params.id, updates);
    if (!instruction) {
      return res.status(404).json({ error: "Instruction not found" });
    }
    res.json(instruction);
  } catch (error) {
    console.error("Error updating instruction:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid instruction data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update instruction" });
  }
});

router.delete("/api/instructions/:id", async (req, res) => {
  try {
    const success = await storage.deleteInstruction(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Instruction not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting instruction:", error);
    res.status(500).json({ error: "Failed to delete instruction" });
  }
});

// Rating routes
router.post("/api/recipes/:id/rate", async (req, res) => {
  try {
    const { rating } = req.body;
    const sessionId = req.sessionID || req.ip; // Use session ID or IP as identifier
    
    const ratingData = insertRatingSchema.parse({
      recipeId: req.params.id,
      sessionId,
      rating
    });
    
    const newRating = await storage.addRating(ratingData);
    res.status(201).json(newRating);
  } catch (error) {
    console.error("Error adding rating:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid rating data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to add rating" });
  }
});

router.get("/api/recipes/:id/rating", async (req, res) => {
  try {
    const ratingData = await storage.getRecipeRating(req.params.id);
    res.json(ratingData);
  } catch (error) {
    console.error("Error fetching rating:", error);
    res.status(500).json({ error: "Failed to fetch rating" });
  }
});

export default router;