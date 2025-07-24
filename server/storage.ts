import { 
  recipes, 
  ingredients, 
  instructions, 
  ratings,
  type Recipe, 
  type InsertRecipe,
  type RecipeWithDetails,
  type Ingredient,
  type InsertIngredient,
  type Instruction,
  type InsertInstruction,
  type Rating,
  type InsertRating,
  type User, 
  type InsertUser 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and } from "drizzle-orm";

export interface IStorage {
  // Legacy user methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Recipe methods
  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: number): Promise<RecipeWithDetails | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: number, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined>;
  deleteRecipe(id: number): Promise<boolean>;
  searchRecipes(query: string): Promise<Recipe[]>;
  
  // Ingredient methods
  createIngredients(ingredients: InsertIngredient[]): Promise<Ingredient[]>;
  updateIngredients(recipeId: number, ingredients: InsertIngredient[]): Promise<Ingredient[]>;
  
  // Instruction methods
  createInstructions(instructions: InsertInstruction[]): Promise<Instruction[]>;
  updateInstructions(recipeId: number, instructions: InsertInstruction[]): Promise<Instruction[]>;
  
  // Rating methods
  addRating(rating: InsertRating): Promise<Rating>;
  updateRecipeRating(recipeId: number): Promise<void>;
  
  // Shopping list methods
  getShoppingListItems(ingredientIds: number[]): Promise<Ingredient[]>;
}

export class DatabaseStorage implements IStorage {
  // Legacy user methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(recipes).where(eq(recipes.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined; // Not needed for this app
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    throw new Error("User creation not supported in this app");
  }

  // Recipe methods
  async getRecipes(): Promise<Recipe[]> {
    return await db
      .select()
      .from(recipes)
      .orderBy(desc(recipes.createdAt));
  }

  async getRecipe(id: number): Promise<RecipeWithDetails | undefined> {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, id));

    if (!recipe) return undefined;

    const [recipeIngredients, recipeInstructions] = await Promise.all([
      db
        .select()
        .from(ingredients)
        .where(eq(ingredients.recipeId, id))
        .orderBy(asc(ingredients.order)),
      db
        .select()
        .from(instructions)
        .where(eq(instructions.recipeId, id))
        .orderBy(asc(instructions.order))
    ]);

    return {
      ...recipe,
      ingredients: recipeIngredients,
      instructions: recipeInstructions,
    };
  }

  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [newRecipe] = await db
      .insert(recipes)
      .values(recipe)
      .returning();
    return newRecipe;
  }

  async updateRecipe(id: number, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined> {
    const [updatedRecipe] = await db
      .update(recipes)
      .set(recipe)
      .where(eq(recipes.id, id))
      .returning();
    return updatedRecipe || undefined;
  }

  async deleteRecipe(id: number): Promise<boolean> {
    // Delete related data first
    await Promise.all([
      db.delete(ingredients).where(eq(ingredients.recipeId, id)),
      db.delete(instructions).where(eq(instructions.recipeId, id)),
      db.delete(ratings).where(eq(ratings.recipeId, id))
    ]);

    const result = await db
      .delete(recipes)
      .where(eq(recipes.id, id));
    
    return result.rowCount > 0;
  }

  async searchRecipes(query: string): Promise<Recipe[]> {
    return await db
      .select()
      .from(recipes)
      .where(sql`${recipes.title} ILIKE ${`%${query}%`} OR ${recipes.description} ILIKE ${`%${query}%`}`)
      .orderBy(desc(recipes.averageRating), desc(recipes.createdAt));
  }

  // Ingredient methods
  async createIngredients(ingredientList: InsertIngredient[]): Promise<Ingredient[]> {
    if (ingredientList.length === 0) return [];
    
    return await db
      .insert(ingredients)
      .values(ingredientList)
      .returning();
  }

  async updateIngredients(recipeId: number, ingredientList: InsertIngredient[]): Promise<Ingredient[]> {
    // Delete existing ingredients
    await db.delete(ingredients).where(eq(ingredients.recipeId, recipeId));
    
    // Insert new ingredients
    return await this.createIngredients(ingredientList);
  }

  // Instruction methods
  async createInstructions(instructionList: InsertInstruction[]): Promise<Instruction[]> {
    if (instructionList.length === 0) return [];
    
    return await db
      .insert(instructions)
      .values(instructionList)
      .returning();
  }

  async updateInstructions(recipeId: number, instructionList: InsertInstruction[]): Promise<Instruction[]> {
    // Delete existing instructions
    await db.delete(instructions).where(eq(instructions.recipeId, recipeId));
    
    // Insert new instructions
    return await this.createInstructions(instructionList);
  }

  // Rating methods
  async addRating(rating: InsertRating): Promise<Rating> {
    // Check if session already rated this recipe
    const existingRating = await db
      .select()
      .from(ratings)
      .where(and(
        eq(ratings.recipeId, rating.recipeId),
        eq(ratings.sessionId, rating.sessionId)
      ));

    if (existingRating.length > 0) {
      // Update existing rating
      const [updatedRating] = await db
        .update(ratings)
        .set({ rating: rating.rating })
        .where(and(
          eq(ratings.recipeId, rating.recipeId),
          eq(ratings.sessionId, rating.sessionId)
        ))
        .returning();
      
      await this.updateRecipeRating(rating.recipeId);
      return updatedRating;
    } else {
      // Create new rating
      const [newRating] = await db
        .insert(ratings)
        .values(rating)
        .returning();
      
      await this.updateRecipeRating(rating.recipeId);
      return newRating;
    }
  }

  async updateRecipeRating(recipeId: number): Promise<void> {
    const ratingStats = await db
      .select({
        avgRating: sql<number>`AVG(${ratings.rating})`,
        count: sql<number>`COUNT(${ratings.rating})`
      })
      .from(ratings)
      .where(eq(ratings.recipeId, recipeId));

    const stats = ratingStats[0];
    if (stats) {
      await db
        .update(recipes)
        .set({
          averageRating: stats.avgRating?.toFixed(2) || "0",
          ratingCount: Math.floor(stats.count) || 0
        })
        .where(eq(recipes.id, recipeId));
    }
  }

  // Shopping list methods
  async getShoppingListItems(ingredientIds: number[]): Promise<Ingredient[]> {
    if (ingredientIds.length === 0) return [];
    
    return await db
      .select()
      .from(ingredients)
      .where(sql`${ingredients.id} = ANY(${ingredientIds})`);
  }
}

export const storage = new DatabaseStorage();
