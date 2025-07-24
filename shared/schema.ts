import { pgTable, text, integer, timestamp, uuid, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  prepTime: integer("prep_time"), // in minutes
  cookTime: integer("cook_time"), // in minutes
  servings: integer("servings"),
  difficulty: text("difficulty"), // easy, medium, hard
  sourceUrl: text("source_url"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  ratingCount: integer("rating_count").default(0),
  clonedFromId: uuid("cloned_from_id").references(() => recipes.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  notes: text("notes"),
  price: decimal("price", { precision: 8, scale: 2 }),
  brand: text("brand"),
  orderIndex: integer("order_index").default(0),
});

export const instructions = pgTable("instructions", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "cascade" }).notNull(),
  step: integer("step").notNull(),
  description: text("description").notNull(),
  time: integer("time"), // in minutes
  temperature: text("temperature"),
  orderIndex: integer("order_index").default(0),
});

export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "cascade" }).notNull(),
  sessionId: text("session_id").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertRecipeSchema = createInsertSchema(recipes).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  rating: true,
  ratingCount: true
});

export const insertIngredientSchema = createInsertSchema(ingredients).omit({ 
  id: true 
});

export const insertInstructionSchema = createInsertSchema(instructions).omit({ 
  id: true 
});

export const insertRatingSchema = createInsertSchema(ratings).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = z.infer<typeof insertRecipeSchema>;
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = z.infer<typeof insertIngredientSchema>;
export type Instruction = typeof instructions.$inferSelect;
export type NewInstruction = z.infer<typeof insertInstructionSchema>;
export type Rating = typeof ratings.$inferSelect;
export type NewRating = z.infer<typeof insertRatingSchema>;

// Full recipe with relations
export interface RecipeWithDetails extends Recipe {
  ingredients: Ingredient[];
  instructions: Instruction[];
}