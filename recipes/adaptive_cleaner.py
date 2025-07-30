"""
Adaptive Recipe Cleaning System
Combines rule-based cleaning with AI cleaning and learns from user feedback
"""
import re
import json
from typing import Dict, List, Any, Optional, Tuple
from django.db import transaction
from django.db.models import Q, F
from .models import CleaningRule, RecipeCleaningFeedback
from .recipe_cleaner import RecipeCleaner
import logging

logger = logging.getLogger(__name__)


class RuleBasedCleaner:
    """Apply learned rules for recipe cleaning"""
    
    def __init__(self):
        self.load_rules()
    
    def load_rules(self):
        """Load active rules from database"""
        self.rules = {
            'ingredient': list(CleaningRule.objects.filter(category='ingredient', is_active=True)),
            'instruction': list(CleaningRule.objects.filter(category='instruction', is_active=True)),
            'description': list(CleaningRule.objects.filter(category='description', is_active=True)),
            'general': list(CleaningRule.objects.filter(category='general', is_active=True))
        }
    
    def apply_rules(self, data: Dict[str, Any], category: str = None) -> Dict[str, Any]:
        """Apply rules to recipe data"""
        cleaned_data = data.copy()
        
        # Apply general rules first
        for rule in self.rules['general']:
            cleaned_data = self._apply_rule_to_data(cleaned_data, rule)
        
        # Apply category-specific rules
        if category:
            for rule in self.rules.get(category, []):
                cleaned_data = self._apply_rule_to_data(cleaned_data, rule)
        
        return cleaned_data
    
    def _apply_rule_to_data(self, data: Dict[str, Any], rule: CleaningRule) -> Dict[str, Any]:
        """Apply a single rule to the data"""
        try:
            pattern = re.compile(rule.pattern, re.IGNORECASE)
            
            if rule.category == 'ingredient' and 'ingredients' in data:
                for ingredient in data['ingredients']:
                    if 'name' in ingredient:
                        ingredient['name'] = pattern.sub(rule.replacement, ingredient['name'])
                    if 'quantity' in ingredient:
                        ingredient['quantity'] = pattern.sub(rule.replacement, str(ingredient['quantity']))
            
            elif rule.category == 'instruction' and 'instructions' in data:
                for instruction in data['instructions']:
                    if 'description' in instruction:
                        instruction['description'] = pattern.sub(rule.replacement, instruction['description'])
            
            elif rule.category == 'description' and 'description' in data:
                data['description'] = pattern.sub(rule.replacement, data['description'])
            
            # Track successful application
            rule.success_count = F('success_count') + 1
            rule.save(update_fields=['success_count'])
            
        except Exception as e:
            logger.error(f"Error applying rule {rule.id}: {str(e)}")
            rule.failure_count = F('failure_count') + 1
            rule.save(update_fields=['failure_count'])
        
        return data
    
    def post_process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply post-processing rules after AI cleaning"""
        # Reload rules to get latest
        self.load_rules()
        
        # Apply all rules as post-processing
        for category in ['general', 'ingredient', 'instruction', 'description']:
            data = self.apply_rules(data, category)
        
        return data


class FeedbackAnalyzer:
    """Analyze feedback to improve cleaning"""
    
    def generate_prompt(self, recipe_data: Dict[str, Any], similar_corrections: List[Dict] = None) -> str:
        """Generate enhanced prompt based on feedback"""
        base_prompt = """You are a recipe data cleaning assistant. Your job is to:
1. Fix spelling and grammar errors
2. Standardize ingredient formats (e.g., "1 tsp" instead of "1 teaspoon")
3. Make instructions clear and concise
4. Remove any promotional content or irrelevant information
5. Ensure quantities are properly formatted

Return cleaned data in the exact same JSON structure as provided.
Do not add or remove fields, only clean the existing content."""
        
        if similar_corrections:
            examples_prompt = "\n\nHere are examples of good cleaning corrections:\n"
            for correction in similar_corrections[:3]:  # Use top 3 examples
                examples_prompt += f"\nOriginal: {correction['before']}\nCleaned: {correction['after']}\n"
            base_prompt += examples_prompt
        
        return base_prompt
    
    def discover_patterns(self, min_occurrences: int = 3) -> List[Tuple[str, str, str]]:
        """Discover patterns from user feedback"""
        patterns = []
        
        # Analyze feedback with corrections
        feedbacks = RecipeCleaningFeedback.objects.filter(
            feedback_type='needs_improvement',
            user_corrections__isnull=False
        ).select_related('recipe')
        
        # Look for common corrections
        correction_map = {}
        for feedback in feedbacks:
            original = feedback.original_data
            corrected = feedback.user_corrections
            
            # Compare ingredients
            if 'ingredients' in original and 'ingredients' in corrected:
                for orig_ing, corr_ing in zip(original['ingredients'], corrected['ingredients']):
                    if orig_ing.get('name') != corr_ing.get('name'):
                        key = (orig_ing.get('name', ''), corr_ing.get('name', ''))
                        correction_map[key] = correction_map.get(key, 0) + 1
            
            # Compare descriptions
            if original.get('description') != corrected.get('description'):
                # Extract common phrase changes
                # This is simplified - in production you'd use more sophisticated diff
                pass
        
        # Create patterns from common corrections
        for (original, corrected), count in correction_map.items():
            if count >= min_occurrences:
                # Create regex pattern
                pattern = re.escape(original)
                patterns.append((pattern, corrected, 'ingredient'))
        
        return patterns
    
    def get_similar_examples(self, recipe_data: Dict[str, Any], limit: int = 5) -> List[Dict]:
        """Get examples of well-cleaned similar recipes"""
        good_feedbacks = RecipeCleaningFeedback.objects.filter(
            feedback_type='good'
        ).order_by('-created_at')[:limit]
        
        examples = []
        for feedback in good_feedbacks:
            examples.append({
                'before': feedback.original_data,
                'after': feedback.cleaned_data
            })
        
        return examples


class AdaptiveRecipeCleaner:
    """Main adaptive cleaning system"""
    
    def __init__(self):
        self.base_cleaner = RecipeCleaner()
        self.rule_engine = RuleBasedCleaner()
        self.feedback_analyzer = FeedbackAnalyzer()
    
    def clean_recipe(self, recipe_data: Dict[str, Any], enable_adaptive: bool = True) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Clean recipe with adaptive learning
        Returns: (cleaned_data, original_data)
        """
        # Store original for feedback
        original_data = json.loads(json.dumps(recipe_data))
        
        if not enable_adaptive:
            # Just use base cleaner
            cleaned = self.base_cleaner.clean_recipe(recipe_data)
            return cleaned, original_data
        
        try:
            # Step 1: Apply learned rules first
            pre_cleaned = self.rule_engine.apply_rules(recipe_data)
            
            # Step 2: Get similar examples for better prompting
            similar_examples = self.feedback_analyzer.get_similar_examples(recipe_data)
            
            # Step 3: Generate enhanced prompt
            enhanced_prompt = self.feedback_analyzer.generate_prompt(
                recipe_data, 
                similar_corrections=similar_examples
            )
            
            # Step 4: Clean with AI using enhanced prompt
            # Temporarily override the system prompt
            original_prompt = self.base_cleaner.system_prompt
            self.base_cleaner.system_prompt = enhanced_prompt
            ai_cleaned = self.base_cleaner.clean_recipe(pre_cleaned)
            self.base_cleaner.system_prompt = original_prompt
            
            # Step 5: Apply post-processing rules
            final_cleaned = self.rule_engine.post_process(ai_cleaned)
            
            return final_cleaned, original_data
            
        except Exception as e:
            logger.error(f"Adaptive cleaning failed: {str(e)}")
            # Fallback to basic cleaning
            cleaned = self.base_cleaner.clean_recipe(recipe_data)
            return cleaned, original_data
    
    def learn_from_feedback(self):
        """Process feedback to create new rules"""
        try:
            # Discover new patterns
            patterns = self.feedback_analyzer.discover_patterns()
            
            # Create new rules from patterns
            new_rules = []
            for pattern, replacement, category in patterns:
                # Check if rule already exists
                if not CleaningRule.objects.filter(
                    pattern=pattern,
                    replacement=replacement,
                    category=category
                ).exists():
                    rule = CleaningRule.objects.create(
                        pattern=pattern,
                        replacement=replacement,
                        category=category,
                        example_before=pattern,
                        example_after=replacement,
                        created_from_feedback=True
                    )
                    new_rules.append(rule)
            
            # Reload rules in the engine
            self.rule_engine.load_rules()
            
            return new_rules
            
        except Exception as e:
            logger.error(f"Error learning from feedback: {str(e)}")
            return []


# Initialize default cleaning rules
def initialize_default_rules():
    """Create some default cleaning rules"""
    default_rules = [
        # Ingredient abbreviations
        ('tablespoon(s)?', 'tbsp', 'ingredient', '1 tablespoon butter', '1 tbsp butter'),
        ('teaspoon(s)?', 'tsp', 'ingredient', '2 teaspoons salt', '2 tsp salt'),
        ('pound(s)?', 'lb', 'ingredient', '2 pounds chicken', '2 lb chicken'),
        ('ounce(s)?', 'oz', 'ingredient', '8 ounces cheese', '8 oz cheese'),
        ('cup(s)?', 'cup', 'ingredient', '2 cups flour', '2 cup flour'),
        
        # Common fixes
        ('EVOO', 'extra virgin olive oil', 'ingredient', 'EVOO', 'extra virgin olive oil'),
        ('veggies', 'vegetables', 'ingredient', 'mixed veggies', 'mixed vegetables'),
        
        # Instruction improvements
        ('Pre-heat', 'Preheat', 'instruction', 'Pre-heat oven', 'Preheat oven'),
        ('stir constantly', 'stir frequently', 'instruction', 'stir constantly', 'stir frequently'),
    ]
    
    created_count = 0
    for pattern, replacement, category, before, after in default_rules:
        rule, created = CleaningRule.objects.get_or_create(
            pattern=pattern,
            replacement=replacement,
            category=category,
            defaults={
                'example_before': before,
                'example_after': after,
                'is_active': True
            }
        )
        if created:
            created_count += 1
    
    return created_count