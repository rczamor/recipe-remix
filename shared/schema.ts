import { pgTable, text, serial, integer, boolean, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url"),
  prepTimeMinutes: integer("prep_time_minutes"),
  cookTimeMinutes: integer("cook_time_minutes"),
  servings: integer("servings"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  ratingCount: integer("rating_count").default(0),
  isCloned: boolean("is_cloned").default(false),
  originalRecipeId: integer("original_recipe_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull(),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  brand: text("brand"),
  price: decimal("price", { precision: 8, scale: 2 }),
  order: integer("order").notNull(),
});

export const instructions = pgTable("instructions", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull(),
  description: text("description").notNull(),
  timeframe: text("timeframe"),
  order: integer("order").notNull(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull(),
  rating: integer("rating").notNull(), // 1-5
  sessionId: text("session_id").notNull(), // For anonymous rating tracking
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const recipesRelations = relations(recipes, ({ many, one }) => ({
  ingredients: many(ingredients),
  instructions: many(instructions),
  ratings: many(ratings),
  originalRecipe: one(recipes, {
    fields: [recipes.originalRecipeId],
    references: [recipes.id],
  }),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [ingredients.recipeId],
    references: [recipes.id],
  }),
}));

export const instructionsRelations = relations(instructions, ({ one }) => ({
  recipe: one(recipes, {
    fields: [instructions.recipeId],
    references: [recipes.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  recipe: one(recipes, {
    fields: [ratings.recipeId],
    references: [recipes.id],
  }),
}));

// Insert schemas
export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  averageRating: true,
  ratingCount: true,
  createdAt: true,
});

export const insertIngredientSchema = createInsertSchema(ingredients).omit({
  id: true,
});

export const insertInstructionSchema = createInsertSchema(instructions).omit({
  id: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

// Types
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Instruction = typeof instructions.$inferSelect;
export type InsertInstruction = z.infer<typeof insertInstructionSchema>;
export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;

// Complex types for API responses
export type RecipeWithDetails = Recipe & {
  ingredients: Ingredient[];
  instructions: Instruction[];
};

export type ScrapedRecipeData = {
  title: string;
  description?: string;
  imageUrl?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  ingredients: Array<{
    name: string;
    quantity: string;
    brand?: string;
    price?: string;
  }>;
  instructions: Array<{
    description: string;
    timeframe?: string;
  }>;
};

// Legacy user schema (keeping for compatibility)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
