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
        container.className = 'bg-white rounded-lg shadow-md p-6';
        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Meal Planning Calendar</h2>
                <div class="flex items-center space-x-2">
                    <button id="prev-week" class="p-2 hover:bg-gray-100 rounded">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span id="week-display" class="font-semibold mx-4"></span>
                    <button id="next-week" class="p-2 hover:bg-gray-100 rounded">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <button id="generate-shopping-list" class="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        <i class="fas fa-shopping-cart mr-2"></i>Generate Shopping List
                    </button>
                </div>
            </div>
            
            <div id="calendar-grid" class="grid grid-cols-7 gap-2">
                <!-- Calendar will be populated here -->
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
        document.getElementById('generate-shopping-list').addEventListener('click', () => this.generateShoppingList());
        document.getElementById('close-shopping-modal').addEventListener('click', () => this.closeShoppingModal());
        
        // Enable drag and drop
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        // Make recipe cards draggable
        document.addEventListener('dragstart', (e) => {
            if (e.target.closest('.recipe-card')) {
                const recipeCard = e.target.closest('.recipe-card');
                const recipeId = recipeCard.dataset.recipeId;
                e.dataTransfer.setData('recipeId', recipeId);
                e.dataTransfer.effectAllowed = 'copy';
                recipeCard.classList.add('opacity-50');
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.closest('.recipe-card')) {
                e.target.closest('.recipe-card').classList.remove('opacity-50');
            }
        });
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
                            <div class="meal-drop-zone bg-white border-2 border-dashed border-gray-300 rounded p-2 min-h-[40px] hover:border-blue-400 transition-colors">
                                ${this.renderMealPlan(dateStr, mealType)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            grid.appendChild(dayCard);
        }
        
        // Setup drop zones
        this.setupDropZones();
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
        
        return '<div class="text-gray-400 text-center">Drop recipe here</div>';
    }

    setupDropZones() {
        const dropZones = document.querySelectorAll('.meal-drop-zone');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                zone.classList.add('bg-blue-50', 'border-blue-400');
            });
            
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('bg-blue-50', 'border-blue-400');
            });
            
            zone.addEventListener('drop', async (e) => {
                e.preventDefault();
                zone.classList.remove('bg-blue-50', 'border-blue-400');
                
                const recipeId = e.dataTransfer.getData('recipeId');
                const mealSlot = zone.closest('.meal-slot');
                const date = mealSlot.dataset.date;
                const mealType = mealSlot.dataset.mealType;
                
                if (recipeId) {
                    await this.addToMealPlan(recipeId, date, mealType);
                }
            });
        });
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
                this.displayShoppingList(shoppingList);
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