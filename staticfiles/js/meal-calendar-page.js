// Meal Calendar Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const calendar = new MealCalendarPage();
});

class MealCalendarPage {
    constructor() {
        this.currentWeek = this.getWeekStart(new Date());
        this.mealPlans = {};
        this.mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        this.recipes = [];
        this.init();
    }

    init() {
        this.isMobile = window.innerWidth < 768;
        this.currentDay = new Date();
        this.updateWeekDisplay();
        this.renderCalendarGrid();
        this.loadRecipes();
        this.loadMealPlans();
        this.bindEvents();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 768;
            if (wasMobile !== this.isMobile) {
                this.renderCalendarGrid();
            }
        });
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

    updateWeekDisplay() {
        const weekDisplay = document.getElementById('weekDisplay');
        if (!weekDisplay) return;
        
        const endDate = new Date(this.currentWeek);
        endDate.setDate(endDate.getDate() + 6);
        
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        weekDisplay.textContent = `${this.currentWeek.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    }

    renderCalendarGrid() {
        if (this.isMobile) {
            this.renderMobileView();
        } else {
            this.renderDesktopView();
        }
    }
    
    renderDesktopView() {
        const calendarDays = document.getElementById('calendarDays');
        if (!calendarDays) return;
        
        calendarDays.innerHTML = '';
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeek);
            date.setDate(date.getDate() + i);
            const dateStr = this.formatDate(date);
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day bg-white border border-gray-200 rounded-lg p-2';
            dayDiv.dataset.date = dateStr;
            
            // Date header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'text-sm font-semibold text-gray-700 mb-2';
            dateHeader.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dayDiv.appendChild(dateHeader);
            
            // Meal slots
            this.mealTypes.forEach(mealType => {
                const mealSlot = document.createElement('div');
                mealSlot.className = 'meal-slot mb-1 p-1';
                mealSlot.dataset.date = dateStr;
                mealSlot.dataset.mealType = mealType;
                
                const mealLabel = document.createElement('div');
                mealLabel.className = 'text-xs text-gray-500 capitalize';
                mealLabel.textContent = mealType;
                mealSlot.appendChild(mealLabel);
                
                const mealContent = document.createElement('div');
                mealContent.className = 'meal-content';
                mealContent.id = `meal-${dateStr}-${mealType}`;
                mealSlot.appendChild(mealContent);
                
                dayDiv.appendChild(mealSlot);
            });
            
            calendarDays.appendChild(dayDiv);
        }
        
        this.setupDragAndDrop();
    }
    
    renderMobileView() {
        const mobileDayView = document.getElementById('mobileDayView');
        if (!mobileDayView) return;
        
        const dateStr = this.formatDate(this.currentDay);
        
        mobileDayView.innerHTML = '';
        
        // Date header
        const dateHeader = document.createElement('div');
        dateHeader.className = 'text-lg font-semibold text-gray-800 mb-4';
        dateHeader.textContent = this.currentDay.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });
        mobileDayView.appendChild(dateHeader);
        
        // Meal slots
        this.mealTypes.forEach(mealType => {
            const mealSection = document.createElement('div');
            mealSection.className = 'mb-4';
            
            const mealLabel = document.createElement('h3');
            mealLabel.className = 'text-md font-semibold text-gray-700 capitalize mb-2';
            mealLabel.textContent = mealType;
            mealSection.appendChild(mealLabel);
            
            const mealSlot = document.createElement('div');
            mealSlot.className = 'meal-slot bg-gray-50 rounded-lg p-3 min-h-[60px]';
            mealSlot.dataset.date = dateStr;
            mealSlot.dataset.mealType = mealType;
            
            const mealContent = document.createElement('div');
            mealContent.className = 'meal-content';
            mealContent.id = `meal-${dateStr}-${mealType}`;
            mealSlot.appendChild(mealContent);
            
            mealSection.appendChild(mealSlot);
            mobileDayView.appendChild(mealSection);
        });
        
        this.setupDragAndDrop();
    }

    loadRecipes() {
        fetch('/api/recipes/')
            .then(response => response.json())
            .then(data => {
                this.recipes = data;
                this.renderRecipeList();
            })
            .catch(error => console.error('Error loading recipes:', error));
    }

    renderRecipeList() {
        const recipeList = document.getElementById('recipeList');
        if (!recipeList) return;
        
        recipeList.innerHTML = '';
        
        this.recipes.forEach(recipe => {
            const recipeCard = document.createElement('div');
            recipeCard.className = 'recipe-card bg-white border border-gray-200 rounded-lg p-3 cursor-move';
            recipeCard.draggable = true;
            recipeCard.dataset.recipeId = recipe.id;
            recipeCard.dataset.recipeTitle = recipe.title;
            
            recipeCard.innerHTML = `
                ${recipe.image_url ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="w-full h-24 object-cover rounded-md mb-2">` : ''}
                <h4 class="text-sm font-semibold text-gray-800">${recipe.title}</h4>
                <div class="flex items-center text-xs text-gray-500 mt-1">
                    <i class="fas fa-clock mr-1"></i>
                    ${recipe.prep_time_minutes + recipe.cook_time_minutes} mins
                </div>
            `;
            
            recipeList.appendChild(recipeCard);
        });
    }

    setupDragAndDrop() {
        // Recipe cards
        const recipeCards = document.querySelectorAll('.recipe-card');
        recipeCards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('recipeId', card.dataset.recipeId);
                e.dataTransfer.setData('recipeTitle', card.dataset.recipeTitle);
                card.classList.add('dragging');
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });
        
        // Meal slots
        const mealSlots = document.querySelectorAll('.meal-slot');
        mealSlots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                slot.classList.add('drag-over');
            });
            
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                
                const recipeId = e.dataTransfer.getData('recipeId');
                const recipeTitle = e.dataTransfer.getData('recipeTitle');
                const date = slot.dataset.date;
                const mealType = slot.dataset.mealType;
                
                this.addMealToPlan(date, mealType, recipeId, recipeTitle);
            });
        });
    }

    addMealToPlan(date, mealType, recipeId, recipeTitle) {
        if (!this.mealPlans[date]) {
            this.mealPlans[date] = {};
        }
        
        this.mealPlans[date][mealType] = {
            recipeId: recipeId,
            recipeTitle: recipeTitle
        };
        
        // Update UI
        const mealContent = document.getElementById(`meal-${date}-${mealType}`);
        if (mealContent) {
            mealContent.innerHTML = `
                <div class="recipe-item flex items-center justify-between">
                    <span class="text-xs">${recipeTitle}</span>
                    <button class="remove-meal text-red-500 hover:text-red-700" data-date="${date}" data-meal-type="${mealType}">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            `;
            
            // Add remove event
            const removeBtn = mealContent.querySelector('.remove-meal');
            removeBtn.addEventListener('click', () => {
                this.removeMealFromPlan(date, mealType);
            });
        }
        
        // Save to server
        this.saveMealPlan(date, mealType, recipeId);
    }

    removeMealFromPlan(date, mealType) {
        if (this.mealPlans[date] && this.mealPlans[date][mealType]) {
            delete this.mealPlans[date][mealType];
            
            const mealContent = document.getElementById(`meal-${date}-${mealType}`);
            if (mealContent) {
                mealContent.innerHTML = '';
            }
            
            // Remove from server
            this.deleteMealPlan(date, mealType);
        }
    }

    loadMealPlans() {
        const startDate = this.formatDate(this.currentWeek);
        const endDate = new Date(this.currentWeek);
        endDate.setDate(endDate.getDate() + 6);
        const endDateStr = this.formatDate(endDate);
        
        fetch(`/api/meal-plans/?start_date=${startDate}&end_date=${endDateStr}`)
            .then(response => response.json())
            .then(data => {
                // Clear current meal plans
                this.mealPlans = {};
                
                // Load meal plans into UI
                data.forEach(plan => {
                    if (!this.mealPlans[plan.date]) {
                        this.mealPlans[plan.date] = {};
                    }
                    
                    this.mealPlans[plan.date][plan.meal_type] = {
                        recipeId: plan.recipe_id,
                        recipeTitle: plan.recipe_title
                    };
                    
                    // Update UI
                    const mealContent = document.getElementById(`meal-${plan.date}-${plan.meal_type}`);
                    if (mealContent) {
                        mealContent.innerHTML = `
                            <div class="recipe-item flex items-center justify-between">
                                <span class="text-xs">${plan.recipe_title}</span>
                                <button class="remove-meal text-red-500 hover:text-red-700" data-date="${plan.date}" data-meal-type="${plan.meal_type}">
                                    <i class="fas fa-times text-xs"></i>
                                </button>
                            </div>
                        `;
                        
                        // Add remove event
                        const removeBtn = mealContent.querySelector('.remove-meal');
                        removeBtn.addEventListener('click', () => {
                            this.removeMealFromPlan(plan.date, plan.meal_type);
                        });
                    }
                });
            })
            .catch(error => console.error('Error loading meal plans:', error));
    }

    saveMealPlan(date, mealType, recipeId) {
        fetch('/api/meal-plans/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCookie('csrftoken')
            },
            body: JSON.stringify({
                date: date,
                meal_type: mealType,
                recipe_id: recipeId
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Meal plan saved:', data);
        })
        .catch(error => console.error('Error saving meal plan:', error));
    }

    deleteMealPlan(date, mealType) {
        fetch(`/api/meal-plans/delete/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCookie('csrftoken')
            },
            body: JSON.stringify({
                date: date,
                meal_type: mealType
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Meal plan deleted:', data);
        })
        .catch(error => console.error('Error deleting meal plan:', error));
    }

    navigateWeek(direction) {
        this.currentWeek.setDate(this.currentWeek.getDate() + (direction * 7));
        this.updateWeekDisplay();
        this.renderCalendarGrid();
        this.loadRecipes();
        this.loadMealPlans();
    }

    generateShoppingList() {
        const startDate = this.formatDate(this.currentWeek);
        const endDate = new Date(this.currentWeek);
        endDate.setDate(endDate.getDate() + 6);
        const endDateStr = this.formatDate(endDate);
        
        fetch('/api/meal-plans/generate-shopping-list/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCookie('csrftoken')
            },
            body: JSON.stringify({
                start_date: startDate,
                end_date: endDateStr,
                name: `Week of ${this.currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.shopping_list_id) {
                window.location.href = `/shopping-lists/${data.shopping_list_id}/`;
            }
        })
        .catch(error => console.error('Error generating shopping list:', error));
    }

    bindEvents() {
        // Previous week button
        const prevBtn = document.getElementById('prevWeekBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateWeek(-1));
        }
        
        // Next week button
        const nextBtn = document.getElementById('nextWeekBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateWeek(1));
        }
        
        // Generate shopping list button
        const generateBtn = document.getElementById('generateShoppingListBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateShoppingList());
        }
    }

    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}