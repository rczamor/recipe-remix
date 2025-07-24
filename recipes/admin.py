from django.contrib import admin
from .models import Recipe, Ingredient, Instruction, Rating


class IngredientInline(admin.TabularInline):
    model = Ingredient
    extra = 1
    fields = ['order', 'quantity', 'name', 'brand', 'price']


class InstructionInline(admin.TabularInline):
    model = Instruction
    extra = 1
    fields = ['order', 'description', 'timeframe']


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ['title', 'servings', 'prep_time_minutes', 'cook_time_minutes', 'average_rating', 'rating_count', 'is_cloned', 'created_at']
    list_filter = ['is_cloned', 'created_at', 'average_rating']
    search_fields = ['title', 'description']
    readonly_fields = ['average_rating', 'rating_count', 'created_at']
    inlines = [IngredientInline, InstructionInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'image_url', 'source_url')
        }),
        ('Recipe Details', {
            'fields': ('prep_time_minutes', 'cook_time_minutes', 'servings')
        }),
        ('Clone Information', {
            'fields': ('is_cloned', 'original_recipe'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('average_rating', 'rating_count', 'created_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ['name', 'quantity', 'recipe', 'brand', 'price', 'order']
    list_filter = ['recipe']
    search_fields = ['name', 'recipe__title']


@admin.register(Instruction)
class InstructionAdmin(admin.ModelAdmin):
    list_display = ['recipe', 'order', 'description_preview', 'timeframe']
    list_filter = ['recipe']
    search_fields = ['description', 'recipe__title']
    
    def description_preview(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_preview.short_description = 'Description'


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ['recipe', 'rating', 'session_id', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['recipe__title']
    readonly_fields = ['created_at']
