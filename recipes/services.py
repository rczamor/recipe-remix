import json
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Optional, Any
from .models import Recipe, RecipeRevision, Ingredient, Instruction
from .recipe_cleaner import RecipeCleaner
from .adaptive_cleaner import AdaptiveRecipeCleaner


def create_recipe_revision(recipe: Recipe, change_summary: str = "") -> RecipeRevision:
    """Create a revision of the recipe with all its current data"""
    
    # Get the next revision number
    last_revision = recipe.revisions.order_by('-revision_number').first()
    revision_number = (last_revision.revision_number + 1) if last_revision else 1
    
    # Create ingredients data
    ingredients_data = []
    for ingredient in recipe.ingredients.all():
        ingredients_data.append({
            'name': ingredient.name,
            'quantity': ingredient.quantity,
            'brand': ingredient.brand,
            'price': str(ingredient.price) if ingredient.price else None,
            'order': ingredient.order
        })
    
    # Create instructions data
    instructions_data = []
    for instruction in recipe.instructions.all():
        instructions_data.append({
            'description': instruction.description,
            'timeframe': instruction.timeframe,
            'order': instruction.order
        })
    
    # Create the revision
    revision = RecipeRevision.objects.create(
        recipe=recipe,
        revision_number=revision_number,
        title=recipe.title,
        description=recipe.description,
        image_url=recipe.image_url,
        source_url=recipe.source_url,
        prep_time_minutes=recipe.prep_time_minutes,
        cook_time_minutes=recipe.cook_time_minutes,
        servings=recipe.servings,
        difficulty=recipe.difficulty,
        category=recipe.category,
        tags=recipe.tags,
        notes=recipe.notes,
        is_favorite=recipe.is_favorite,
        is_cloned=recipe.is_cloned,
        original_recipe_id=recipe.original_recipe.id if recipe.original_recipe else None,
        ingredients_data=ingredients_data,
        instructions_data=instructions_data,
        change_summary=change_summary
    )
    
    return revision


class RecipeScrapingService:
    """Service for scraping recipe data from URLs"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.cleaner = AdaptiveRecipeCleaner()
    
    def scrape_recipe(self, url: str, enable_cleaning: bool = True) -> Dict[str, Any]:
        """
        Scrape a recipe from a given URL.
        Returns a dictionary with recipe data.
        If enable_cleaning is True, uses AI to clean and standardize the data.
        """
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Try JSON-LD structured data first
            recipe_data = self._extract_json_ld(soup)
            if recipe_data:
                recipe_data['source_url'] = url
                return recipe_data
            
            # Fallback to HTML parsing
            recipe_data = self._extract_from_html(soup, url)
            recipe_data['source_url'] = url
            return recipe_data
            
        except requests.RequestException as e:
            raise Exception(f"Failed to fetch recipe: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to parse recipe: {str(e)}")
    
    def _extract_json_ld(self, soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """Extract recipe data from JSON-LD structured data"""
        scripts = soup.find_all('script', type='application/ld+json')
        
        for script in scripts:
            try:
                data = json.loads(script.string)
                
                # Handle array of objects
                if isinstance(data, list):
                    for item in data:
                        if item.get('@type') == 'Recipe':
                            return self._parse_json_ld_recipe(item)
                
                # Handle single object
                elif data.get('@type') == 'Recipe':
                    return self._parse_json_ld_recipe(data)
                    
            except (json.JSONDecodeError, AttributeError):
                continue
        
        return None
    
    def _parse_json_ld_recipe(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse JSON-LD recipe data into our format"""
        ingredients = []
        if isinstance(data.get('recipeIngredient'), list):
            for i, ingredient in enumerate(data['recipeIngredient']):
                parsed = self._parse_ingredient_text(ingredient)
                parsed['order'] = i + 1
                ingredients.append(parsed)
        
        instructions = []
        if isinstance(data.get('recipeInstructions'), list):
            for i, instruction in enumerate(data['recipeInstructions']):
                text = instruction
                if isinstance(instruction, dict):
                    text = instruction.get('text') or instruction.get('name') or ''
                
                if text:
                    instructions.append({
                        'description': text,
                        'timeframe': '',
                        'order': i + 1
                    })
        
        # Extract image URL
        image_url = ''
        if data.get('image'):
            if isinstance(data['image'], str):
                image_url = data['image']
            elif isinstance(data['image'], list) and data['image']:
                image_url = data['image'][0]
            elif isinstance(data['image'], dict):
                image_url = data['image'].get('url', '')
        
        return {
            'title': data.get('name', 'Untitled Recipe'),
            'description': data.get('description', ''),
            'image_url': image_url,
            'prep_time_minutes': self._parse_duration(data.get('prepTime')),
            'cook_time_minutes': self._parse_duration(data.get('cookTime')),
            'servings': self._parse_servings(data.get('recipeYield') or data.get('yield')),
            'ingredients': ingredients,
            'instructions': instructions
        }
    
    def _extract_from_html(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract recipe data from HTML using common selectors"""
        
        # Extract title
        title = self._extract_title(soup)
        
        # Extract description
        description = self._extract_description(soup)
        
        # Extract image
        image_url = self._extract_image(soup, url)
        
        # Extract timing
        prep_time = self._extract_time(soup, ['prep-time', 'prepTime', 'prep_time'])
        cook_time = self._extract_time(soup, ['cook-time', 'cookTime', 'cook_time'])
        
        # Extract servings
        servings = self._extract_servings(soup)
        
        # Extract ingredients
        ingredients = self._extract_ingredients(soup)
        
        # Extract instructions
        instructions = self._extract_instructions(soup)
        
        raw_data = {
            'title': title,
            'description': description,
            'image_url': image_url,
            'prep_time_minutes': prep_time,
            'cook_time_minutes': cook_time,
            'servings': servings,
            'ingredients': ingredients,
            'instructions': instructions
        }
        
        # Clean the scraped data using the adaptive cleaner if enabled
        if enable_cleaning:
            try:
                cleaned_data, original_data = self.cleaner.clean_recipe(raw_data, enable_adaptive=True)
                # Store original data for potential feedback
                cleaned_data['_original_data'] = original_data
                return cleaned_data
            except Exception as e:
                print(f"Warning: Recipe cleaning failed, returning raw data. Error: {str(e)}")
                return raw_data
        else:
            return raw_data
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract recipe title"""
        selectors = [
            'h1.recipe-title',
            'h1.entry-title',
            '.recipe-header h1',
            'h1'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text(strip=True):
                return element.get_text(strip=True)
        
        # Fallback to page title
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text(strip=True)
            # Remove site name from title
            title = re.sub(r'\s*\|\s*.+$', '', title)
            return title
        
        return 'Imported Recipe'
    
    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract recipe description"""
        selectors = [
            '.recipe-summary',
            '.recipe-description',
            '.recipe-intro p',
            'meta[name="description"]'
        ]
        
        for selector in selectors:
            if selector.startswith('meta'):
                element = soup.select_one(selector)
                if element:
                    return element.get('content', '').strip()
            else:
                element = soup.select_one(selector)
                if element and element.get_text(strip=True):
                    return element.get_text(strip=True)
        
        return ''
    
    def _extract_image(self, soup: BeautifulSoup, base_url: str) -> str:
        """Extract recipe image URL"""
        selectors = [
            '.recipe-image img',
            '.recipe-header img',
            '.entry-content img',
            'meta[property="og:image"]'
        ]
        
        for selector in selectors:
            if selector.startswith('meta'):
                element = soup.select_one(selector)
                if element:
                    return element.get('content', '').strip()
            else:
                element = soup.select_one(selector)
                if element and element.get('src'):
                    return urljoin(base_url, element['src'])
        
        return ''
    
    def _extract_time(self, soup: BeautifulSoup, class_names: List[str]) -> Optional[int]:
        """Extract time information"""
        for class_name in class_names:
            elements = soup.find_all(class_=lambda x: x and class_name in x)
            for element in elements:
                text = element.get_text(strip=True)
                time_minutes = self._parse_time_text(text)
                if time_minutes:
                    return time_minutes
        
        return None
    
    def _extract_servings(self, soup: BeautifulSoup) -> Optional[int]:
        """Extract servings information"""
        selectors = [
            '[class*="servings"]',
            '[class*="yield"]',
            'meta[name="recipe:serves"]'
        ]
        
        for selector in selectors:
            if selector.startswith('meta'):
                element = soup.select_one(selector)
                if element:
                    text = element.get('content', '')
            else:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                else:
                    continue
            
            # Extract number from text
            match = re.search(r'\d+', text)
            if match:
                return int(match.group())
        
        return None
    
    def _extract_ingredients(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract ingredients list"""
        ingredients = []
        
        selectors = [
            '.recipe-ingredient',
            '.ingredients li',
            '.recipe-ingredients li',
            '[class*="ingredient"] li'
        ]
        
        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                for i, element in enumerate(elements):
                    text = element.get_text(strip=True)
                    if text:
                        parsed = self._parse_ingredient_text(text)
                        parsed['order'] = i + 1
                        ingredients.append(parsed)
                break
        
        # If no ingredients found, add placeholder
        if not ingredients:
            ingredients.append({
                'name': 'No ingredients found - please edit this recipe',
                'quantity': '1',
                'brand': '',
                'price': None,
                'order': 1
            })
        
        return ingredients
    
    def _extract_instructions(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract cooking instructions"""
        instructions = []
        
        selectors = [
            '.recipe-instruction',
            '.instructions li',
            '.recipe-instructions li',
            '.recipe-directions li',
            '[class*="instruction"] li'
        ]
        
        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                for i, element in enumerate(elements):
                    text = element.get_text(strip=True)
                    if text and len(text) > 10:  # Filter out very short text
                        instructions.append({
                            'description': text,
                            'timeframe': '',
                            'order': i + 1
                        })
                break
        
        # If no instructions found, add placeholder
        if not instructions:
            instructions.append({
                'description': 'No instructions found - please edit this recipe',
                'timeframe': '',
                'order': 1
            })
        
        return instructions
    
    def _parse_ingredient_text(self, text: str) -> Dict[str, Any]:
        """Parse ingredient text to extract quantity and name"""
        # Basic ingredient parsing - extract quantity and name
        match = re.match(r'^([\d\s\/\-\.,]+(?:\s*(?:cups?|tbsp|tsp|oz|lbs?|pounds?|grams?|kg|ml|l|liters?|teaspoons?|tablespoons?|ounces?|cloves?|pieces?|slices?|cans?|packages?|bottles?))?)\s*(.+)$', text.strip(), re.IGNORECASE)
        
        if match:
            return {
                'quantity': match.group(1).strip(),
                'name': match.group(2).strip(),
                'brand': '',
                'price': None
            }
        
        # If no clear quantity found, assume the whole text is the ingredient name
        return {
            'quantity': '1',
            'name': text.strip(),
            'brand': '',
            'price': None
        }
    
    def _parse_duration(self, duration: str) -> Optional[int]:
        """Parse ISO 8601 duration or time text to minutes"""
        if not duration:
            return None
        
        # Parse ISO 8601 duration (PT15M)
        iso_match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?', duration)
        if iso_match:
            hours = int(iso_match.group(1) or 0)
            minutes = int(iso_match.group(2) or 0)
            return hours * 60 + minutes
        
        return self._parse_time_text(duration)
    
    def _parse_time_text(self, text: str) -> Optional[int]:
        """Parse time text to minutes"""
        if not text:
            return None
        
        text = text.lower()
        
        # Extract numbers and time units
        hour_match = re.search(r'(\d+)\s*(?:hours?|hrs?|h\b)', text)
        minute_match = re.search(r'(\d+)\s*(?:minutes?|mins?|m\b)', text)
        
        hours = int(hour_match.group(1)) if hour_match else 0
        minutes = int(minute_match.group(1)) if minute_match else 0
        
        total_minutes = hours * 60 + minutes
        return total_minutes if total_minutes > 0 else None
    
    def _parse_servings(self, servings: Any) -> Optional[int]:
        """Parse servings from various formats"""
        if not servings:
            return None
        
        if isinstance(servings, int):
            return servings
        
        if isinstance(servings, str):
            match = re.search(r'\d+', servings)
            if match:
                return int(match.group())
        
        return None