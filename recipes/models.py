from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Recipe(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    source_url = models.URLField(blank=True)
    prep_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    cook_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    servings = models.PositiveIntegerField(null=True, blank=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    category = models.CharField(max_length=100, blank=True)
    tags = models.CharField(max_length=200, blank=True, help_text="Comma-separated tags")
    notes = models.TextField(blank=True, help_text="Personal notes about this recipe")
    is_favorite = models.BooleanField(default=False)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    rating_count = models.PositiveIntegerField(default=0)
    is_cloned = models.BooleanField(default=False)
    original_recipe = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def total_time_minutes(self):
        prep = self.prep_time_minutes or 0
        cook = self.cook_time_minutes or 0
        return prep + cook


class Ingredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ingredients')
    name = models.CharField(max_length=200)
    quantity = models.CharField(max_length=50)
    brand = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.quantity} {self.name}"


class Instruction(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='instructions')
    description = models.TextField()
    timeframe = models.CharField(max_length=50, blank=True)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Step {self.order}: {self.description[:50]}..."


class Rating(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ratings')
    rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    session_id = models.CharField(max_length=40)  # For anonymous rating tracking
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['recipe', 'session_id']

    def __str__(self):
        return f"{self.rating} stars for {self.recipe.title}"


class RecipeRevision(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='revisions')
    revision_number = models.PositiveIntegerField()
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    source_url = models.URLField(blank=True)
    prep_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    cook_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    servings = models.PositiveIntegerField(null=True, blank=True)
    difficulty = models.CharField(max_length=10, default='medium')
    category = models.CharField(max_length=100, blank=True)
    tags = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    is_favorite = models.BooleanField(default=False)
    is_cloned = models.BooleanField(default=False)
    original_recipe_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    change_summary = models.CharField(max_length=500, blank=True)
    
    # Store ingredients and instructions as JSON
    ingredients_data = models.JSONField(default=list)
    instructions_data = models.JSONField(default=list)
    
    class Meta:
        ordering = ['-revision_number']
        unique_together = ['recipe', 'revision_number']
        
    def __str__(self):
        return f"{self.recipe.title} - Revision {self.revision_number}"


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    session_id = models.CharField(max_length=40)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    recipe = models.ForeignKey(Recipe, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_messages')
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['created_at']
        
    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."


class MealPlan(models.Model):
    MEAL_TYPE_CHOICES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
    ]
    
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='meal_plans')
    date = models.DateField()
    meal_type = models.CharField(max_length=10, choices=MEAL_TYPE_CHOICES, default='dinner')
    session_id = models.CharField(max_length=40)  # For anonymous meal planning
    created_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['date', 'meal_type']
        unique_together = ['recipe', 'date', 'meal_type', 'session_id']
        
    def __str__(self):
        return f"{self.recipe.title} on {self.date} ({self.meal_type})"


class ShoppingList(models.Model):
    session_id = models.CharField(max_length=40)
    name = models.CharField(max_length=200, default='Weekly Shopping List')
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.name} ({self.start_date} to {self.end_date})"


class ShoppingListItem(models.Model):
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200)
    quantity = models.CharField(max_length=100)
    category = models.CharField(max_length=100, blank=True)  # Produce, Dairy, etc.
    is_purchased = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['category', 'order', 'name']
        
    def __str__(self):
        return f"{self.quantity} {self.name}"


class RecipeCleaningFeedback(models.Model):
    """Store user feedback on recipe cleaning quality"""
    FEEDBACK_CHOICES = [
        ('good', 'Good'),
        ('needs_improvement', 'Needs Improvement'),
    ]
    
    ISSUE_CHOICES = [
        ('ingredients', 'Ingredients'),
        ('instructions', 'Instructions'),
        ('description', 'Description'),
        ('timing', 'Timing'),
        ('servings', 'Servings'),
    ]
    
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='cleaning_feedback')
    original_data = models.JSONField()  # Original scraped data
    cleaned_data = models.JSONField()  # AI cleaned data
    user_corrections = models.JSONField(null=True, blank=True)  # User's manual corrections
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_CHOICES)
    specific_issues = models.JSONField(default=list)  # List of issue types
    notes = models.TextField(blank=True)
    session_id = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Feedback for {self.recipe.title} - {self.feedback_type}"


class CleaningRule(models.Model):
    """Learned rules for recipe cleaning"""
    CATEGORY_CHOICES = [
        ('ingredient', 'Ingredient'),
        ('instruction', 'Instruction'),
        ('description', 'Description'),
        ('general', 'General'),
    ]
    
    pattern = models.CharField(max_length=500)  # Regex pattern or keyword
    replacement = models.CharField(max_length=500)  # Replacement rule
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    example_before = models.CharField(max_length=500)  # Example input
    example_after = models.CharField(max_length=500)  # Example output
    success_count = models.IntegerField(default=0)
    failure_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_from_feedback = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-success_count', 'category', 'pattern']
    
    @property
    def success_rate(self):
        total = self.success_count + self.failure_count
        return (self.success_count / total * 100) if total > 0 else 0
    
    def __str__(self):
        return f"{self.category}: {self.pattern} → {self.replacement}"
