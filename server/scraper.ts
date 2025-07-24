import * as cheerio from "cheerio";

interface ScrapedRecipe {
  title?: string;
  description?: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients?: Array<{
    name: string;
    quantity?: string;
    unit?: string;
  }>;
  instructions?: Array<{
    step: number;
    description: string;
  }>;
}

export async function scrapeRecipe(url: string): Promise<ScrapedRecipe> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract JSON-LD structured data first
    const jsonLdData = extractJsonLdData($);
    if (jsonLdData) {
      return jsonLdData;
    }

    // Fallback to HTML parsing
    return extractFromHtml($, url);
  } catch (error) {
    console.error("Error scraping recipe:", error);
    throw new Error("Failed to scrape recipe from URL");
  }
}

function extractJsonLdData($: cheerio.CheerioAPI): ScrapedRecipe | null {
  try {
    const jsonLdScript = $('script[type="application/ld+json"]').first();
    if (!jsonLdScript.length) return null;

    const jsonData = JSON.parse(jsonLdScript.html() || "{}");
    const recipe = Array.isArray(jsonData) ? 
      jsonData.find(item => item["@type"] === "Recipe") : 
      (jsonData["@type"] === "Recipe" ? jsonData : null);

    if (!recipe) return null;

    const result: ScrapedRecipe = {
      title: recipe.name,
      description: recipe.description,
    };

    // Extract image
    if (recipe.image) {
      const imageUrl = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;
      result.imageUrl = typeof imageUrl === "string" ? imageUrl : imageUrl?.url;
    }

    // Extract times
    if (recipe.prepTime) {
      result.prepTime = parseISO8601Duration(recipe.prepTime);
    }
    if (recipe.cookTime) {
      result.cookTime = parseISO8601Duration(recipe.cookTime);
    }

    // Extract servings
    if (recipe.recipeYield) {
      const yield_value = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield;
      result.servings = parseInt(yield_value) || undefined;
    }

    // Extract ingredients
    if (recipe.recipeIngredient) {
      result.ingredients = recipe.recipeIngredient.map((ingredient: string, index: number) => {
        const parsed = parseIngredient(ingredient);
        return {
          name: parsed.name,
          quantity: parsed.quantity,
          unit: parsed.unit,
        };
      });
    }

    // Extract instructions
    if (recipe.recipeInstructions) {
      result.instructions = recipe.recipeInstructions.map((instruction: any, index: number) => {
        const text = instruction.text || instruction.name || instruction;
        return {
          step: index + 1,
          description: typeof text === "string" ? text : String(text),
        };
      });
    }

    return result;
  } catch (error) {
    console.error("Error parsing JSON-LD:", error);
    return null;
  }
}

function extractFromHtml($: cheerio.CheerioAPI, url: string): ScrapedRecipe {
  const result: ScrapedRecipe = {};

  // Extract title
  result.title = $("h1").first().text().trim() || 
                $('meta[property="og:title"]').attr("content") || 
                $("title").text().trim();

  // Extract description
  result.description = $('meta[property="og:description"]').attr("content") || 
                      $('meta[name="description"]').attr("content");

  // Extract image
  result.imageUrl = $('meta[property="og:image"]').attr("content") || 
                   $("img").first().attr("src");

  // Try to extract ingredients from common selectors
  const ingredientSelectors = [
    ".recipe-ingredient",
    ".ingredient",
    ".ingredients li",
    "[class*=ingredient] li",
    ".recipe-ingredients li"
  ];

  for (const selector of ingredientSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      result.ingredients = elements.map((i, el) => {
        const text = $(el).text().trim();
        const parsed = parseIngredient(text);
        return {
          name: parsed.name,
          quantity: parsed.quantity,
          unit: parsed.unit,
        };
      }).get();
      break;
    }
  }

  // Try to extract instructions from common selectors
  const instructionSelectors = [
    ".recipe-instruction",
    ".instruction",
    ".instructions li",
    ".directions li",
    "[class*=instruction] li",
    ".recipe-instructions li"
  ];

  for (const selector of instructionSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      result.instructions = elements.map((i, el) => ({
        step: i + 1,
        description: $(el).text().trim(),
      })).get();
      break;
    }
  }

  return result;
}

function parseISO8601Duration(duration: string): number | undefined {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  return hours * 60 + minutes;
}

function parseIngredient(text: string): { name: string; quantity?: string; unit?: string } {
  // Simple regex to extract quantity, unit, and ingredient name
  const match = text.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(\w+)?\s+(.+)$/);
  
  if (match) {
    return {
      quantity: match[1],
      unit: match[2],
      name: match[3].trim(),
    };
  }
  
  // If no match, return the whole text as name
  return { name: text.trim() };
}