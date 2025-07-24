import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import * as schema from "@shared/schema";
import type { 
  Recipe, 
  NewRecipe, 
  Ingredient, 
  NewIngredient, 
  Instruction, 
  NewInstruction,
  Rating,
  NewRating,
  RecipeWithDetails 
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export interface IStorage {
  // Recipe operations
  getRecipes(search?: string): Promise<Recipe[]>;
  getRecipe(id: string): Promise<RecipeWithDetails | null>;
  createRecipe(recipe: NewRecipe): Promise<Recipe>;
  updateRecipe(id: string, recipe: Partial<NewRecipe>): Promise<Recipe | null>;
  deleteRecipe(id: string): Promise<boolean>;
  cloneRecipe(id: string): Promise<Recipe | null>;

  // Ingredient operations
  createIngredient(ingredient: NewIngredient): Promise<Ingredient>;
  updateIngredient(id: string, ingredient: Partial<NewIngredient>): Promise<Ingredient | null>;
  deleteIngredient(id: string): Promise<boolean>;

  // Instruction operations
  createInstruction(instruction: NewInstruction): Promise<Instruction>;
  updateInstruction(id: string, instruction: Partial<NewInstruction>): Promise<Instruction | null>;
  deleteInstruction(id: string): Promise<boolean>;

  // Rating operations
  addRating(rating: NewRating): Promise<Rating>;
  getRecipeRating(recipeId: string): Promise<{ rating: number; count: number }>;
}

export class DatabaseStorage implements IStorage {
  async getRecipes(search?: string): Promise<Recipe[]> {
    if (search) {
      return db.select().from(schema.recipes)
        .where(
          sql`${schema.recipes.title} ILIKE ${'%' + search + '%'} OR ${schema.recipes.description} ILIKE ${'%' + search + '%'}`
        )
        .orderBy(desc(schema.recipes.createdAt));
    }
    return db.select().from(schema.recipes).orderBy(desc(schema.recipes.createdAt));
  }

  async getRecipe(id: string): Promise<RecipeWithDetails | null> {
    const recipe = await db.select().from(schema.recipes).where(eq(schema.recipes.id, id)).limit(1);
    if (!recipe[0]) return null;

    const ingredients = await db.select().from(schema.ingredients)
      .where(eq(schema.ingredients.recipeId, id))
      .orderBy(schema.ingredients.orderIndex);

    const instructions = await db.select().from(schema.instructions)
      .where(eq(schema.instructions.recipeId, id))
      .orderBy(schema.instructions.step);

    return {
      ...recipe[0],
      ingredients,
      instructions,
    };
  }

  async createRecipe(recipe: NewRecipe): Promise<Recipe> {
    const result = await db.insert(schema.recipes).values(recipe).returning();
    return result[0];
  }

  async updateRecipe(id: string, recipe: Partial<NewRecipe>): Promise<Recipe | null> {
    const result = await db.update(schema.recipes)
      .set({ ...recipe, updatedAt: new Date() })
      .where(eq(schema.recipes.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteRecipe(id: string): Promise<boolean> {
    const result = await db.delete(schema.recipes).where(eq(schema.recipes.id, id));
    return result.rowCount > 0;
  }

  async cloneRecipe(id: string): Promise<Recipe | null> {
    const originalRecipe = await this.getRecipe(id);
    if (!originalRecipe) return null;

    // Create new recipe
    const newRecipe = await this.createRecipe({
      title: `${originalRecipe.title} (Copy)`,
      description: originalRecipe.description,
      imageUrl: originalRecipe.imageUrl,
      prepTime: originalRecipe.prepTime,
      cookTime: originalRecipe.cookTime,
      servings: originalRecipe.servings,
      difficulty: originalRecipe.difficulty,
      sourceUrl: originalRecipe.sourceUrl,
      clonedFromId: id,
    });

    // Clone ingredients
    for (const ingredient of originalRecipe.ingredients) {
      await this.createIngredient({
        recipeId: newRecipe.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        price: ingredient.price,
        brand: ingredient.brand,
        orderIndex: ingredient.orderIndex,
      });
    }

    // Clone instructions
    for (const instruction of originalRecipe.instructions) {
      await this.createInstruction({
        recipeId: newRecipe.id,
        step: instruction.step,
        description: instruction.description,
        time: instruction.time,
        temperature: instruction.temperature,
        orderIndex: instruction.orderIndex,
      });
    }

    return newRecipe;
  }

  async createIngredient(ingredient: NewIngredient): Promise<Ingredient> {
    const result = await db.insert(schema.ingredients).values(ingredient).returning();
    return result[0];
  }

  async updateIngredient(id: string, ingredient: Partial<NewIngredient>): Promise<Ingredient | null> {
    const result = await db.update(schema.ingredients)
      .set(ingredient)
      .where(eq(schema.ingredients.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteIngredient(id: string): Promise<boolean> {
    const result = await db.delete(schema.ingredients).where(eq(schema.ingredients.id, id));
    return result.rowCount > 0;
  }

  async createInstruction(instruction: NewInstruction): Promise<Instruction> {
    const result = await db.insert(schema.instructions).values(instruction).returning();
    return result[0];
  }

  async updateInstruction(id: string, instruction: Partial<NewInstruction>): Promise<Instruction | null> {
    const result = await db.update(schema.instructions)
      .set(instruction)
      .where(eq(schema.instructions.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteInstruction(id: string): Promise<boolean> {
    const result = await db.delete(schema.instructions).where(eq(schema.instructions.id, id));
    return result.rowCount > 0;
  }

  async addRating(rating: NewRating): Promise<Rating> {
    // Check if user already rated this recipe
    const existingRating = await db.select().from(schema.ratings)
      .where(and(
        eq(schema.ratings.recipeId, rating.recipeId),
        eq(schema.ratings.sessionId, rating.sessionId)
      )).limit(1);

    let result;
    if (existingRating[0]) {
      // Update existing rating
      result = await db.update(schema.ratings)
        .set({ rating: rating.rating })
        .where(eq(schema.ratings.id, existingRating[0].id))
        .returning();
    } else {
      // Create new rating
      result = await db.insert(schema.ratings).values(rating).returning();
    }

    // Update recipe average rating
    await this.updateRecipeRating(rating.recipeId);
    
    return result[0];
  }

  async getRecipeRating(recipeId: string): Promise<{ rating: number; count: number }> {
    const result = await db.select({
      rating: sql<number>`COALESCE(AVG(${schema.ratings.rating}), 0)`,
      count: sql<number>`COUNT(${schema.ratings.id})`
    }).from(schema.ratings)
      .where(eq(schema.ratings.recipeId, recipeId));

    return {
      rating: Math.round((result[0]?.rating || 0) * 100) / 100,
      count: result[0]?.count || 0
    };
  }

  private async updateRecipeRating(recipeId: string): Promise<void> {
    const ratingData = await this.getRecipeRating(recipeId);
    await db.update(schema.recipes)
      .set({ 
        rating: ratingData.rating.toString(), 
        ratingCount: ratingData.count 
      })
      .where(eq(schema.recipes.id, recipeId));
  }
}

export const storage = new DatabaseStorage();