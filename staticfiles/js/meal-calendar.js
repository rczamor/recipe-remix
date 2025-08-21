// Meal Planning Calendar
class MealCalendar {
    constructor() {
        this.currentWeek = this.getWeekStart(new Date());
        this.mealPlans = {};
        this.mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        this.init();
    }

    init() {
        this.createCalendarUI();
        this.bindEvents();
        this.loadWeekMealPlans();
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    createCalendarUI() {
        const wrapper = document.getElementById('meal-calendar-wrapper');
        if (!wrapper) return;
        
        const container = document.createElement('div');
        container.id = 'meal-calendar-container';
        container.className = 'bg-white rounded-lg shadow-md p-6 max-h-[calc(100vh-100px)] overflow-y-auto';
        container.innerHTML = `
            <div class="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2">
                <h2 class="text-2xl font-bold text-gray-800">Meal Planning Calendar</h2>
                <div class="flex items-center space-x-2">
                    <button id="prev-week" class="p-2 hover:bg-gray-100 rounded">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span id="week-display" class="font-semibold mx-4"></span>
                    <button id="next-week" class="p-2 hover:bg-gray-100 rounded">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <button id="save-calendar" class="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-save mr-2"></i>Save Changes
                    </button>
                    <button id="generate-shopping-list" class="ml-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        <i class="fas fa-shopping-cart mr-2"></i>Generate Shopping List
                    </button>
                </div>
            </div>
            
            <div id="calendar-grid" class="grid grid-cols-7 gap-2">
                <!-- Calendar will be populated here -->
            </div>
            
            <!-- Recipe Selection Modal -->
            <div id="recipe-selection-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Select Recipe</h3>
                        <button id="close-recipe-modal" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="mb-4">
                        <input type="text" id="recipe-search-input" placeholder="Search recipes..." 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div id="recipe-selection-list" class="flex-1 overflow-y-auto">
                        <!-- Recipe list will be populated here -->
                    </div>
                </div>
            </div>
            
            <!-- Shopping List Modal -->
            <div id="shopping-list-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Shopping List</h3>
                        <button id="close-shopping-modal" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div id="shopping-list-content">
                        <!-- Shopping list will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        // Insert into the wrapper
        wrapper.innerHTML = '';
        wrapper.appendChild(container);
    }

    bindEvents() {
        document.getElementById('prev-week').addEventListener('click', () => this.changeWeek(-1));
        document.getElementById('next-week').addEventListener('click', () => this.changeWeek(1));
        document.getElementById('save-calendar').addEventListener('click', () => this.saveCalendarChanges());
        document.getElementById('generate-shopping-list').addEventListener('click', () => this.generateShoppingList());
        document.getElementById('close-shopping-modal').addEventListener('click', () => this.closeShoppingModal());
        document.getElementById('close-recipe-modal').addEventListener('click', () => this.closeRecipeSelectionModal());
        
        // Recipe search with debounce
        let searchTimeout;
        document.getElementById('recipe-search-input').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.searchRecipes(e.target.value), 300);
        });
    }

    openRecipeSelectionModal(date, mealType) {
        this.selectedDate = date;
        this.selectedMealType = mealType;
        
        const modal = document.getElementById('recipe-selection-modal');
        modal.classList.remove('hidden');
        
        // Load recipes
        this.loadRecipesForSelection();
    }
    
    closeRecipeSelectionModal() {
        document.getElementById('recipe-selection-modal').classList.add('hidden');
        document.getElementById('recipe-search-input').value = '';
    }
    
    async loadRecipesForSelection(searchQuery = '') {
        const listContainer = document.getElementById('recipe-selection-list');
        listContainer.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading recipes...</div>';
        
        try {
            const url = searchQuery ? `/api/recipes/?q=${encodeURIComponent(searchQuery)}` : '/api/recipes/';
            const response = await fetch(url);
            
            if (response.ok) {
                const recipes = await response.json();
                this.displayRecipesForSelection(recipes);
            }
        } catch (error) {
            console.error('Error loading recipes:', error);
            listContainer.innerHTML = '<div class="text-center text-red-500 py-4">Failed to load recipes</div>';
        }
    }
    
    displayRecipesForSelection(recipes) {
        const listContainer = document.getElementById('recipe-selection-list');
        
        if (recipes.length === 0) {
            listContainer.innerHTML = '<div class="text-center text-gray-500 py-4">No recipes found</div>';
            return;
        }
        
        listContainer.innerHTML = recipes.map(recipe => `
            <div class="recipe-selection-item border rounded-lg p-3 mb-2 hover:bg-gray-50 cursor-pointer transition-colors"
                 onclick="mealCalendar.selectRecipeForMeal(${recipe.id})">
                <div class="flex items-start">
                    ${recipe.image_url ? `
                        <img src="${recipe.image_url}" alt="${recipe.title}" class="w-16 h-16 rounded object-cover mr-3">
                    ` : ''}
                    <div class="flex-1">
                        <h4 class="font-semibold">${recipe.title}</h4>
                        ${recipe.description ? `<p class="text-sm text-gray-600 mt-1">${recipe.description.substring(0, 100)}...</p>` : ''}
                        <div class="flex items-center text-xs text-gray-500 mt-2">
                            ${recipe.prep_time ? `<span><i class="fas fa-clock"></i> ${recipe.prep_time}min</span>` : ''}
                            ${recipe.cook_time ? `<span class="ml-3"><i class="fas fa-fire"></i> ${recipe.cook_time}min</span>` : ''}
                            ${recipe.servings ? `<span class="ml-3"><i class="fas fa-users"></i> ${recipe.servings}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async selectRecipeForMeal(recipeId) {
        await this.addToMealPlan(recipeId, this.selectedDate, this.selectedMealType);
        this.closeRecipeSelectionModal();
    }
    
    async searchRecipes(query) {
        await this.loadRecipesForSelection(query);
    }

    changeWeek(direction) {
        const newDate = new Date(this.currentWeek);
        newDate.setDate(newDate.getDate() + (direction * 7));
        this.currentWeek = newDate;
        this.loadWeekMealPlans();
    }

    async loadWeekMealPlans() {
        try {
            const weekStart = this.formatDate(this.currentWeek);
            const response = await fetch(`/api/meal-plan/week/?week_start=${weekStart}`);
            
            if (response.ok) {
                const data = await response.json();
                this.mealPlans = data.meal_plans || {};
                this.renderCalendar();
            }
        } catch (error) {
            console.error('Error loading meal plans:', error);
        }
    }

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const weekDisplay = document.getElementById('week-display');
        
        // Update week display
        const weekEnd = new Date(this.currentWeek);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekDisplay.textContent = `${this.currentWeek.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
        
        // Clear grid
        grid.innerHTML = '';
        
        // Render each day
        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeek);
            date.setDate(date.getDate() + i);
            const dateStr = this.formatDate(date);
            
            const dayCard = document.createElement('div');
            dayCard.className = 'bg-gray-50 rounded-lg p-3 min-h-[200px]';
            dayCard.innerHTML = `
                <h4 class="font-semibold text-sm mb-2">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
                <div class="space-y-2">
                    ${this.mealTypes.map(mealType => `
                        <div class="meal-slot" data-date="${dateStr}" data-meal-type="${mealType}">
                            <div class="text-xs font-medium text-gray-600 capitalize mb-1">${mealType}</div>
                            <div class="meal-content bg-white border border-gray-200 rounded p-2 min-h-[40px]">
                                ${this.renderMealPlan(dateStr, mealType)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            grid.appendChild(dayCard);
        }
    }

    renderMealPlan(date, mealType) {
        const dayPlans = this.mealPlans[date] || [];
        const mealPlan = dayPlans.find(mp => mp.meal_type === mealType);
        
        if (mealPlan) {
            return `
                <div class="meal-plan-item bg-blue-100 p-2 rounded text-xs" data-meal-plan-id="${mealPlan.id}">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="font-medium">${mealPlan.recipe_title}</div>
                            ${mealPlan.prep_time || mealPlan.cook_time ? `
                                <div class="text-gray-600 mt-1">
                                    ${mealPlan.prep_time ? `<i class="fas fa-clock"></i> ${mealPlan.prep_time}min` : ''}
                                    ${mealPlan.cook_time ? `<i class="fas fa-fire"></i> ${mealPlan.cook_time}min` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <button onclick="mealCalendar.removeMealPlan(${mealPlan.id})" class="text-red-500 hover:text-red-700 ml-2">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        return `
            <button onclick="mealCalendar.openRecipeSelectionModal('${date}', '${mealType}')" 
                class="w-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded p-1 transition-colors text-xs">
                <i class="fas fa-plus-circle"></i> Add Recipe
            </button>
        `;
    }

    async saveCalendarChanges() {
        const saveBtn = document.getElementById('save-calendar');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
        
        try {
            // Get all current meal plans for the week
            const weekStart = this.formatDate(this.currentWeek);
            const weekEnd = new Date(this.currentWeek);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const response = await fetch('/api/meal-plan/save/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    week_start: weekStart,
                    week_end: this.formatDate(weekEnd),
                    meal_plans: this.mealPlans
                })
            });
            
            if (response.ok) {
                this.showToast('Calendar changes saved successfully', 'success');
            } else {
                this.showToast('Failed to save calendar changes', 'error');
            }
        } catch (error) {
            console.error('Error saving calendar:', error);
            this.showToast('Failed to save calendar changes', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    async addToMealPlan(recipeId, date, mealType) {
        try {
            const response = await fetch('/api/meal-plan/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipe_id: parseInt(recipeId),
                    date: date,
                    meal_type: mealType
                })
            });
            
            if (response.ok) {
                this.showToast('Recipe added to meal plan', 'success');
                await this.loadWeekMealPlans();
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Failed to add to meal plan', 'error');
            }
        } catch (error) {
            console.error('Error adding to meal plan:', error);
            this.showToast('Failed to add to meal plan', 'error');
        }
    }

    async removeMealPlan(mealPlanId) {
        if (!confirm('Remove this recipe from the meal plan?')) return;
        
        try {
            const response = await fetch(`/api/meal-plan/${mealPlanId}/remove/`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showToast('Removed from meal plan', 'success');
                await this.loadWeekMealPlans();
            }
        } catch (error) {
            console.error('Error removing meal plan:', error);
            this.showToast('Failed to remove from meal plan', 'error');
        }
    }

    async generateShoppingList() {
        const generateBtn = document.getElementById('generate-shopping-list');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
        
        try {
            const weekStart = this.formatDate(this.currentWeek);
            const response = await fetch('/api/shopping-list/generate/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    week_start: weekStart
                })
            });
            
            if (response.ok) {
                const shoppingList = await response.json();
                this.showToast('Shopping list generated successfully! Redirecting...', 'success');
                // Navigate to the new shopping list detail page
                setTimeout(() => {
                    window.location.href = `/shopping-lists/${shoppingList.id}/`;
                }, 1000);
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Failed to generate shopping list', 'error');
            }
        } catch (error) {
            console.error('Error generating shopping list:', error);
            this.showToast('Failed to generate shopping list', 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-shopping-cart mr-2"></i>Generate Shopping List';
        }
    }

    displayShoppingList(shoppingList) {
        const modal = document.getElementById('shopping-list-modal');
        const content = document.getElementById('shopping-list-content');
        
        // Group items by category
        const itemsByCategory = {};
        shoppingList.items.forEach(item => {
            if (!itemsByCategory[item.category]) {
                itemsByCategory[item.category] = [];
            }
            itemsByCategory[item.category].push(item);
        });
        
        content.innerHTML = `
            <h4 class="font-semibold mb-3">${shoppingList.name}</h4>
            <div class="text-sm text-gray-600 mb-4">
                ${new Date(shoppingList.start_date).toLocaleDateString()} - ${new Date(shoppingList.end_date).toLocaleDateString()}
            </div>
            
            ${Object.entries(itemsByCategory).map(([category, items]) => `
                <div class="mb-4">
                    <h5 class="font-semibold text-gray-700 mb-2">${category}</h5>
                    <div class="space-y-2">
                        ${items.map(item => `
                            <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <label class="flex items-center flex-1">
                                    <input type="checkbox" 
                                        class="mr-3" 
                                        ${item.is_purchased ? 'checked' : ''}
                                        onchange="mealCalendar.updateShoppingItem(${item.id}, this.checked)"
                                    >
                                    <span class="${item.is_purchased ? 'line-through text-gray-500' : ''}">
                                        ${item.quantity} ${item.name}
                                        ${item.notes ? `<span class="text-gray-500 text-sm ml-2">(${item.notes})</span>` : ''}
                                    </span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            
            <div class="mt-6 flex justify-end space-x-2">
                <button onclick="mealCalendar.printShoppingList()" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                    <i class="fas fa-print mr-2"></i>Print
                </button>
                <button onclick="mealCalendar.closeShoppingModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Done
                </button>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }

    async updateShoppingItem(itemId, isPurchased) {
        try {
            await fetch(`/api/shopping-list/item/${itemId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_purchased: isPurchased
                })
            });
        } catch (error) {
            console.error('Error updating shopping item:', error);
        }
    }

    closeShoppingModal() {
        document.getElementById('shopping-list-modal').classList.add('hidden');
    }

    printShoppingList() {
        window.print();
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white shadow-lg transition-all duration-300 ${
            type === 'success' ? 'bg-green-600' : 
            type === 'error' ? 'bg-red-600' : 
            'bg-blue-600'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize calendar when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mealCalendar = new MealCalendar();
    });
} else {
    window.mealCalendar = new MealCalendar();
}