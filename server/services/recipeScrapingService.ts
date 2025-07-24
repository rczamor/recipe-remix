import { load } from "cheerio";
import type { ScrapedRecipeData } from "@shared/schema";

export async function scrapeRecipe(url: string): Promise<ScrapedRecipeData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recipe: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = load(html);
    
    // Try to find JSON-LD structured data first
    const jsonLd = $('script[type="application/ld+json"]');
    for (let i = 0; i < jsonLd.length; i++) {
      try {
        const data = JSON.parse($(jsonLd[i]).html() || '{}');
        if (data['@type'] === 'Recipe' || (Array.isArray(data) && data.some(item => item['@type'] === 'Recipe'))) {
          const recipe = Array.isArray(data) ? data.find(item => item['@type'] === 'Recipe') : data;
          return parseJsonLdRecipe(recipe);
        }
      } catch (e) {
        // Continue to next script tag
      }
    }
    
    // Fallback to HTML scraping
    return parseHtmlRecipe($, url);
  } catch (error) {
    throw new Error(`Failed to scrape recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseJsonLdRecipe(data: any): ScrapedRecipeData {
  const ingredients = [];
  if (Array.isArray(data.recipeIngredient)) {
    for (const ingredient of data.recipeIngredient) {
      const parsed = parseIngredientText(ingredient);
      ingredients.push(parsed);
    }
  }
  
  const instructions = [];
  if (Array.isArray(data.recipeInstructions)) {
    for (let i = 0; i < data.recipeInstructions.length; i++) {
      const instruction = data.recipeInstructions[i];
      const text = instruction.text || instruction.name || instruction;
      if (text) {
        instructions.push({
          description: text,
          timeframe: undefined
        });
      }
    }
  }
  
  return {
    title: data.name || 'Untitled Recipe',
    description: data.description,
    imageUrl: typeof data.image === 'string' ? data.image : data.image?.url,
    prepTimeMinutes: parseDuration(data.prepTime),
    cookTimeMinutes: parseDuration(data.cookTime),
    servings: parseInt(data.recipeYield) || parseInt(data.yield) || undefined,
    ingredients,
    instructions
  };
}

function parseHtmlRecipe($: any, url: string): ScrapedRecipeData {
  // Common selectors for recipe data
  const title = $('h1').first().text().trim() || 
                $('[class*="recipe-title"], [class*="entry-title"], .recipe-header h1').first().text().trim() ||
                $('title').text().replace(/\s*\|\s*.+$/, '').trim();
  
  const description = $('[class*="recipe-summary"], [class*="recipe-description"], .recipe-intro p').first().text().trim();
  
  const imageUrl = $('[class*="recipe-image"] img, .recipe-header img, .entry-content img').first().attr('src') ||
                   $('meta[property="og:image"]').attr('content');
  
  // Try to extract ingredients
  const ingredients: Array<{name: string, quantity: string, brand?: string}> = [];
  $('[class*="recipe-ingredient"], [class*="ingredients"] li, .recipe-ingredients li, .ingredients li').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text) {
      const parsed = parseIngredientText(text);
      ingredients.push(parsed);
    }
  });
  
  // Try to extract instructions
  const instructions: Array<{description: string, timeframe?: string}> = [];
  $('[class*="recipe-instruction"], [class*="instructions"] li, .recipe-instructions li, .instructions li, .recipe-directions li').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 10) { // Filter out very short text
      instructions.push({
        description: text,
        timeframe: undefined
      });
    }
  });
  
  // Extract timing information
  const prepTime = $('[class*="prep-time"], [class*="prepTime"]').first().text() ||
                   $('meta[name="recipe:prep_time"]').attr('content');
  const cookTime = $('[class*="cook-time"], [class*="cookTime"]').first().text() ||
                   $('meta[name="recipe:cook_time"]').attr('content');
  
  const servings = $('[class*="servings"], [class*="yield"]').first().text() ||
                   $('meta[name="recipe:serves"]').attr('content');
  
  return {
    title: title || 'Imported Recipe',
    description: description || undefined,
    imageUrl: imageUrl ? makeAbsoluteUrl(imageUrl, url) : undefined,
    prepTimeMinutes: parseTimeText(prepTime),
    cookTimeMinutes: parseTimeText(cookTime),
    servings: parseInt(servings) || undefined,
    ingredients: ingredients.length > 0 ? ingredients : [{
      name: 'No ingredients found - please edit this recipe',
      quantity: '1'
    }],
    instructions: instructions.length > 0 ? instructions : [{
      description: 'No instructions found - please edit this recipe'
    }]
  };
}

function parseIngredientText(text: string): {name: string, quantity: string, brand?: string} {
  // Basic ingredient parsing - extract quantity and name
  const match = text.match(/^([\d\s\/\-\.,]+(?:\s*(?:cups?|tbsp|tsp|oz|lbs?|pounds?|grams?|kg|ml|l|liters?|teaspoons?|tablespoons?|ounces?|cloves?|pieces?|slices?|cans?|packages?|bottles?))?)\s*(.+)$/i);
  
  if (match) {
    return {
      quantity: match[1].trim(),
      name: match[2].trim()
    };
  }
  
  // If no clear quantity found, assume the whole text is the ingredient name
  return {
    quantity: '1',
    name: text
  };
}

function parseDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined;
  
  // Parse ISO 8601 duration (PT15M)
  const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || '0');
    const minutes = parseInt(isoMatch[2] || '0');
    return hours * 60 + minutes;
  }
  
  return parseTimeText(duration);
}

function parseTimeText(timeText: string | undefined): number | undefined {
  if (!timeText) return undefined;
  
  const text = timeText.toLowerCase();
  
  // Extract numbers and time units
  const hourMatch = text.match(/(\d+)\s*(?:hours?|hrs?|h\b)/);
  const minuteMatch = text.match(/(\d+)\s*(?:minutes?|mins?|m\b)/);
  
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
  
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes > 0 ? totalMinutes : undefined;
}

function makeAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}
