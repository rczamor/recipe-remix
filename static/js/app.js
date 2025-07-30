// Recipe Manager Application

class RecipeApp {
    constructor() {
        this.recipes = [];
        this.shoppingList = [];
        this.selectedRecipe = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadRecipes();
    }

    bindEvents() {
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchRecipes(e.target.value);
        });
        document.getElementById('mobileSearchInput').addEventListener('input', (e) => {
            this.searchRecipes(e.target.value);
        });

        // Modal controls
        document.getElementById('addRecipeBtn').addEventListener('click', () => {
            this.showAddRecipeModal();
        });
        document.getElementById('emptyAddBtn').addEventListener('click', () => {
            this.showAddRecipeModal();
        });
        document.getElementById('closeAddModal').addEventListener('click', () => {
            this.hideAddRecipeModal();
        });
        document.getElementById('cancelAddBtn').addEventListener('click', () => {
            this.hideAddRecipeModal();
        });

        // Import recipe
        document.getElementById('importRecipeBtn').addEventListener('click', () => {
            console.log('Import Recipe button clicked');
            this.importRecipe();
        });

        // Shopping list
        document.getElementById('shoppingListBtn').addEventListener('click', () => {
            this.toggleShoppingList();
        });
        document.getElementById('closeSidebar').addEventListener('click', () => {
            this.hideShoppingList();
        });

        // Close modals on backdrop click
        document.getElementById('addRecipeModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideAddRecipeModal();
            }
        });
        document.getElementById('recipeModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideRecipeModal();
            }
        });
    }

    async loadRecipes(query = '') {
        this.showLoading();
        try {
            const url = query ? `/api/recipes/?q=${encodeURIComponent(query)}` : '/api/recipes/';
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load recipes');
            
            this.recipes = await response.json();
            this.renderRecipes();
        } catch (error) {
            this.showToast('Failed to load recipes', 'error');
            console.error('Error loading recipes:', error);
        } finally {
            this.hideLoading();
        }
    }

    searchRecipes(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadRecipes(query);
        }, 300);
    }

    renderRecipes() {
        const grid = document.getElementById('recipeGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.recipes.length === 0) {
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        grid.classList.remove('hidden');

        grid.innerHTML = this.recipes.map(recipe => this.renderRecipeCard(recipe)).join('');
    }

    renderRecipeCard(recipe) {
        const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
        const timeText = totalTime > 0 ? `${totalTime} min` : 'Time varies';
        const servingsText = recipe.servings ? `${recipe.servings} servings` : 'Serves varies';
        const rating = parseFloat(recipe.average_rating || 0);

        return `
            <a href="/recipe/${recipe.id}/" class="recipe-card bg-white rounded-xl shadow-md overflow-hidden block hover:shadow-lg transition-shadow" draggable="true" data-recipe-id="${recipe.id}">
                <img
                    src="${recipe.image_url || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop'}"
                    alt="${recipe.title}"
                    class="w-full h-48 object-cover"
                />
                <div class="p-4">
                    <h3 class="font-semibold text-lg mb-2 line-clamp-2">${recipe.title}</h3>
                    
                    <div class="flex items-center mb-2">
                        <div class="flex mr-2">
                            ${this.renderStars(rating)}
                        </div>
                        <span class="text-sm text-gray-600">
                            ${rating.toFixed(1)} (${recipe.rating_count} reviews)
                        </span>
                    </div>
                    
                    <div class="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span>
                            <i class="fas fa-clock mr-1"></i>${timeText}
                        </span>
                        <span>
                            <i class="fas fa-users mr-1"></i>${servingsText}
                        </span>
                    </div>
                    
                    <div class="flex justify-end" onclick="event.stopPropagation(); event.preventDefault();">
                        <button onclick="app.cloneRecipe(${recipe.id})" 
                                class="bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 px-3 rounded-lg transition-colors">
                            <i class="fas fa-copy mr-1"></i>Clone
                        </button>
                    </div>
                </div>
            </a>
        `;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        return Array.from({ length: 5 }).map((_, i) => {
            const filled = i < fullStars || (i === fullStars && hasHalfStar);
            return `<i class="fas fa-star star-rating ${filled ? 'text-yellow-400' : 'text-gray-300'} text-sm"></i>`;
        }).join('');
    }

    viewRecipe(recipeId) {
        // Navigate to the recipe detail page
        window.location.href = `/recipe/${recipeId}/`;
    }

    showRecipeModal() {
        if (!this.selectedRecipe) return;

        const recipe = this.selectedRecipe;
        const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
        const rating = parseFloat(recipe.average_rating || 0);

        const modalContent = `
            <div class="flex justify-between items-start mb-6">
                <div class="flex-1">
                    <h2 class="text-3xl font-bold mb-2">${recipe.title}</h2>
                    <div class="flex items-center space-x-6 text-gray-600">
                        <div class="flex items-center">
                            <div class="flex mr-2">
                                ${this.renderStars(rating)}
                            </div>
                            <span>${rating.toFixed(1)} (${recipe.rating_count} reviews)</span>
                        </div>
                        ${recipe.prep_time_minutes ? `<span><i class="fas fa-clock mr-1"></i>Prep: ${recipe.prep_time_minutes} min</span>` : ''}
                        ${recipe.cook_time_minutes ? `<span><i class="fas fa-utensils mr-1"></i>Cook: ${recipe.cook_time_minutes} min</span>` : ''}
                        ${recipe.servings ? `<span><i class="fas fa-users mr-1"></i>Serves ${recipe.servings}</span>` : ''}
                    </div>
                </div>
                <button onclick="app.hideRecipeModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Recipe Image and Actions -->
                <div class="lg:col-span-1">
                    <img
                        src="${recipe.image_url || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=400&fit=crop'}"
                        alt="${recipe.title}"
                        class="w-full h-64 lg:h-80 object-cover rounded-lg mb-4"
                    />

                    <div class="space-y-3">
                        <button onclick="app.cloneRecipe(${recipe.id})" class="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                            <i class="fas fa-copy mr-2"></i>Clone & Modify Recipe
                        </button>
                        <button onclick="app.deleteRecipe(${recipe.id})" class="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium">
                            <i class="fas fa-trash mr-2"></i>Delete Recipe
                        </button>
                        <button onclick="app.showRevisionHistory(${recipe.id})" class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium">
                            <i class="fas fa-history mr-2"></i>View History
                        </button>
                        <button onclick="app.addAllIngredientsToShoppingList()" class="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium">
                            <i class="fas fa-shopping-cart mr-2"></i>Add to Shopping List
                        </button>
                        <div class="text-center pt-2">
                            <span class="text-sm text-gray-600">Rate this recipe:</span>
                            <div class="flex justify-center space-x-1 mt-1">
                                ${Array.from({ length: 5 }).map((_, i) => 
                                    `<i class="fas fa-star cursor-pointer hover:text-yellow-600 ${i < this.userRating ? 'text-yellow-400' : 'text-gray-300'}" 
                                       onclick="app.rateRecipe(${recipe.id}, ${i + 1})"></i>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ingredients and Instructions -->
                <div class="lg:col-span-2">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Ingredients -->
                        <div>
                            <h3 class="text-xl font-semibold mb-4">Ingredients</h3>
                            <div class="space-y-3">
                                ${recipe.ingredients.map(ing => `
                                    <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                        <input type="checkbox" data-ingredient-id="${ing.id}" class="ingredient-checkbox">
                                        <div class="flex-1">
                                            <span class="font-medium">${ing.quantity}</span>
                                            <span class="ml-1">${ing.name}</span>
                                            ${ing.brand || ing.price ? `
                                                <div class="text-sm text-gray-600">
                                                    ${ing.brand ? `<span>${ing.brand}</span>` : ''}
                                                    ${ing.brand && ing.price ? '<span class="mx-1">•</span>' : ''}
                                                    ${ing.price ? `<span>$${ing.price}</span>` : ''}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Instructions -->
                        <div>
                            <h3 class="text-xl font-semibold mb-4">Instructions</h3>
                            <div class="space-y-4">
                                ${recipe.instructions.map((inst, index) => `
                                    <div class="flex space-x-4">
                                        <div class="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-medium text-sm">
                                            ${index + 1}
                                        </div>
                                        <div class="flex-1">
                                            <p class="text-gray-800">${inst.description}</p>
                                            ${inst.timeframe ? `<span class="text-sm text-gray-600">${inst.timeframe}</span>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('recipeDetails').innerHTML = modalContent;
        document.getElementById('recipeModal').classList.add('show');
    }

    hideRecipeModal() {
        document.getElementById('recipeModal').classList.remove('show');
        this.selectedRecipe = null;
    }

    async cloneRecipe(recipeId) {
        this.hideRecipeModal();
        this.showCloneModal(recipeId);
    }

    addAllIngredientsToShoppingList() {
        if (!this.selectedRecipe) return;
        
        const ingredientIds = this.selectedRecipe.ingredients.map(ing => ing.id);
        this.addToShoppingList(ingredientIds);
        this.hideRecipeModal();
        this.showShoppingList();
    }

    addToShoppingList(ingredientIds) {
        // Add ingredients to shopping list
        this.shoppingList = [...new Set([...this.shoppingList, ...ingredientIds])];
        this.showToast(`${ingredientIds.length} ingredients added to shopping list`, 'success');
    }

    async rateRecipe(recipeId, rating) {
        try {
            const response = await fetch(`/api/recipes/${recipeId}/rate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rating })
            });

            if (!response.ok) throw new Error('Failed to rate recipe');

            this.userRating = rating;
            this.showToast('Rating submitted successfully!', 'success');
            
            // Refresh the recipe data
            this.viewRecipe(recipeId);
            this.loadRecipes();
        } catch (error) {
            this.showToast('Failed to submit rating', 'error');
            console.error('Error rating recipe:', error);
        }
    }

    showAddRecipeModal() {
        document.getElementById('addRecipeModal').classList.add('show');
        document.getElementById('recipeUrl').value = '';
        document.getElementById('addRecipeForm').classList.remove('hidden');
        document.getElementById('importingState').classList.add('hidden');
    }

    hideAddRecipeModal() {
        document.getElementById('addRecipeModal').classList.remove('show');
    }

    async importRecipe() {
        console.log('importRecipe called');
        const url = document.getElementById('recipeUrl').value.trim();
        const enableCleaning = document.getElementById('enableAICleaning').checked;
        console.log('Recipe URL:', url);
        console.log('Enable AI cleaning:', enableCleaning);
        
        if (!url) {
            this.showToast('Please enter a recipe URL', 'error');
            return;
        }

        // Show importing state
        document.getElementById('addRecipeForm').classList.add('hidden');
        document.getElementById('importingState').classList.remove('hidden');

        try {
            const response = await fetch('/api/recipes/scrape/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    url,
                    enable_cleaning: enableCleaning 
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to import recipe');
            }

            const recipeData = await response.json();
            console.log('Recipe data received:', recipeData);
            
            // Hide the loading state and modal
            this.hideAddRecipeModal();
            
            // Show preview modal for editing
            if (recipeData.preview) {
                this.showRecipePreviewModal(recipeData);
            } else {
                // Recipe was saved directly, reload the list
                this.showToast('Recipe imported successfully!', 'success');
                this.loadRecipes();
            }
            
        } catch (error) {
            console.error('Import error:', error);
            this.showToast(error.message || 'Failed to import recipe', 'error');
            // Show form again
            document.getElementById('addRecipeForm').classList.remove('hidden');
            document.getElementById('importingState').classList.add('hidden');
        }
    }

    showRecipePreviewModal(recipeData) {
        const modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Review & Edit Recipe</h2>
                    <button onclick="app.hideRecipePreviewModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <form id="recipePreviewForm" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Recipe Title</label>
                            <input type="text" id="previewTitle" value="${(recipeData.title || '').replace(/"/g, '&quot;')}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Servings</label>
                            <input type="number" id="previewServings" value="${recipeData.servings || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Prep Time (minutes)</label>
                            <input type="number" id="previewPrepTime" value="${recipeData.prep_time_minutes || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Cook Time (minutes)</label>
                            <input type="number" id="previewCookTime" value="${recipeData.cook_time_minutes || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea id="previewDescription" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">${(recipeData.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    </div>

                    ${recipeData.image_url ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Recipe Image</label>
                            <img src="${recipeData.image_url}" alt="Recipe preview" class="w-full max-w-md rounded-lg">
                        </div>
                    ` : ''}

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 class="text-lg font-semibold mb-4">Ingredients</h3>
                            <div id="previewIngredients" class="space-y-3">
                                ${(recipeData.ingredients || []).map((ing, index) => `
                                    <div class="ingredient-row grid grid-cols-12 gap-2 items-center">
                                        <div class="col-span-3">
                                            <input type="text" value="${(ing.quantity || '').replace(/"/g, '&quot;')}" placeholder="Quantity" 
                                                   class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                                        </div>
                                        <div class="col-span-7">
                                            <input type="text" value="${(ing.name || '').replace(/"/g, '&quot;')}" placeholder="Ingredient" 
                                                   class="w-full px-2 py-1 border border-gray-300 rounded text-sm" required>
                                        </div>
                                        <div class="col-span-2">
                                            <button type="button" onclick="this.closest('.ingredient-row').remove()" 
                                                    class="text-red-500 hover:text-red-700">
                                                <i class="fas fa-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" onclick="app.addPreviewIngredientRow()" 
                                    class="mt-3 text-orange-500 hover:text-orange-700 text-sm">
                                <i class="fas fa-plus mr-1"></i>Add Ingredient
                            </button>
                        </div>

                        <div>
                            <h3 class="text-lg font-semibold mb-4">Instructions</h3>
                            <div id="previewInstructions" class="space-y-3">
                                ${(recipeData.instructions || []).map((inst, index) => `
                                    <div class="instruction-row grid grid-cols-12 gap-2 items-start">
                                        <div class="col-span-1 text-center">
                                            <span class="w-6 h-6 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center">
                                                ${index + 1}
                                            </span>
                                        </div>
                                        <div class="col-span-9">
                                            <textarea rows="2" placeholder="Instruction description" 
                                                      class="w-full px-2 py-1 border border-gray-300 rounded text-sm" required>${(inst.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                                        </div>
                                        <div class="col-span-2">
                                            <button type="button" onclick="this.closest('.instruction-row').remove(); app.renumberPreviewInstructions()" 
                                                    class="text-red-500 hover:text-red-700">
                                                <i class="fas fa-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" onclick="app.addPreviewInstructionRow()" 
                                    class="mt-3 text-orange-500 hover:text-orange-700 text-sm">
                                <i class="fas fa-plus mr-1"></i>Add Instruction
                            </button>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button type="button" onclick="app.hideRecipePreviewModal()" 
                                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                            <i class="fas fa-save mr-2"></i>Save Recipe
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('recipePreviewContent').innerHTML = modalContent;
        document.getElementById('recipePreviewModal').classList.add('show');

        // Store recipe data for later use
        this.previewRecipeData = recipeData;

        // Add form submit handler
        document.getElementById('recipePreviewForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePreviewedRecipe();
        });
    }

    hideRecipePreviewModal() {
        document.getElementById('recipePreviewModal').classList.remove('show');
        this.previewRecipeData = null;
    }

    addPreviewIngredientRow() {
        const container = document.getElementById('previewIngredients');
        const newRow = document.createElement('div');
        newRow.className = 'ingredient-row grid grid-cols-12 gap-2 items-center';
        newRow.innerHTML = `
            <div class="col-span-3">
                <input type="text" placeholder="Quantity" 
                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
            </div>
            <div class="col-span-7">
                <input type="text" placeholder="Ingredient" 
                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm" required>
            </div>
            <div class="col-span-2">
                <button type="button" onclick="this.closest('.ingredient-row').remove()" 
                        class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
        `;
        container.appendChild(newRow);
    }

    addPreviewInstructionRow() {
        const container = document.getElementById('previewInstructions');
        const instructionCount = container.children.length + 1;
        const newRow = document.createElement('div');
        newRow.className = 'instruction-row grid grid-cols-12 gap-2 items-start';
        newRow.innerHTML = `
            <div class="col-span-1 text-center">
                <span class="w-6 h-6 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center">
                    ${instructionCount}
                </span>
            </div>
            <div class="col-span-9">
                <textarea rows="2" placeholder="Instruction description" 
                          class="w-full px-2 py-1 border border-gray-300 rounded text-sm" required></textarea>
            </div>
            <div class="col-span-2">
                <button type="button" onclick="this.closest('.instruction-row').remove(); app.renumberPreviewInstructions()" 
                        class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
        `;
        container.appendChild(newRow);
    }

    renumberPreviewInstructions() {
        const instructions = document.querySelectorAll('#previewInstructions .instruction-row');
        instructions.forEach((row, index) => {
            const numberSpan = row.querySelector('span');
            if (numberSpan) {
                numberSpan.textContent = index + 1;
            }
        });
    }

    async savePreviewedRecipe() {
        if (!this.previewRecipeData) return;

        // Collect form data
        const formData = {
            title: document.getElementById('previewTitle').value,
            description: document.getElementById('previewDescription').value,
            servings: parseInt(document.getElementById('previewServings').value) || null,
            prep_time_minutes: parseInt(document.getElementById('previewPrepTime').value) || null,
            cook_time_minutes: parseInt(document.getElementById('previewCookTime').value) || null,
            image_url: this.previewRecipeData.image_url,
            source_url: this.previewRecipeData.source_url,
            ingredients: [],
            instructions: []
        };

        // Collect ingredients
        const ingredientRows = document.querySelectorAll('#previewIngredients .ingredient-row');
        ingredientRows.forEach((row, index) => {
            const inputs = row.querySelectorAll('input');
            if (inputs[1].value.trim()) {
                formData.ingredients.push({
                    quantity: inputs[0].value,
                    name: inputs[1].value,
                    order: index + 1
                });
            }
        });

        // Collect instructions
        const instructionRows = document.querySelectorAll('#previewInstructions .instruction-row');
        instructionRows.forEach((row, index) => {
            const textarea = row.querySelector('textarea');
            if (textarea.value.trim()) {
                formData.instructions.push({
                    description: textarea.value,
                    order: index + 1
                });
            }
        });

        try {
            const response = await fetch('/api/recipes/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save recipe');
            }

            const savedRecipe = await response.json();
            this.showToast('Recipe saved successfully!', 'success');
            this.hideRecipePreviewModal();
            this.loadRecipes();
        } catch (error) {
            this.showToast(error.message, 'error');
            console.error('Error saving recipe:', error);
        }
    }

    showShoppingList() {
        document.getElementById('shoppingSidebar').classList.add('open');
        this.loadShoppingList();
    }

    hideShoppingList() {
        document.getElementById('shoppingSidebar').classList.remove('open');
    }

    toggleShoppingList() {
        const sidebar = document.getElementById('shoppingSidebar');
        if (sidebar.classList.contains('open')) {
            this.hideShoppingList();
        } else {
            this.showShoppingList();
        }
    }

    async loadShoppingList() {
        if (this.shoppingList.length === 0) {
            document.getElementById('shoppingListContent').innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No items in your shopping list</p>
                    <p class="text-sm mt-2">Add ingredients from recipes to get started</p>
                </div>
            `;
            return;
        }

        try {
            const response = await fetch('/api/shopping-list/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ingredient_ids: this.shoppingList })
            });

            if (!response.ok) throw new Error('Failed to load shopping list');

            const items = await response.json();
            this.renderShoppingList(items);
        } catch (error) {
            this.showToast('Failed to load shopping list', 'error');
            console.error('Error loading shopping list:', error);
        }
    }

    renderShoppingList(items) {
        const totalCost = items.reduce((sum, item) => {
            return sum + (parseFloat(item.price) || 0);
        }, 0);

        const content = `
            <div class="space-y-4">
                ${items.map(item => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center space-x-3">
                            <input type="checkbox" class="shopping-item-checkbox">
                            <div>
                                <p class="font-medium">${item.name}</p>
                                <p class="text-sm text-gray-600">
                                    <span>${item.quantity}</span>
                                    ${item.brand ? `<span class="mx-1">•</span><span>${item.brand}</span>` : ''}
                                    ${item.price ? `<span class="mx-1">•</span><span>$${item.price}</span>` : ''}
                                </p>
                            </div>
                        </div>
                        <button onclick="app.removeFromShoppingList(${item.id})" 
                                class="text-red-500 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>

            <div class="mt-6 pt-6 border-t border-gray-200">
                <div class="flex justify-between items-center mb-4">
                    <span class="font-semibold">Total Estimated Cost:</span>
                    <span class="font-bold text-orange-500 text-lg">
                        $${totalCost.toFixed(2)}
                    </span>
                </div>
                <button onclick="app.shareShoppingList()" 
                        class="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium">
                    <i class="fas fa-share mr-2"></i>Share Shopping List
                </button>
            </div>
        `;

        document.getElementById('shoppingListContent').innerHTML = content;
    }

    removeFromShoppingList(ingredientId) {
        this.shoppingList = this.shoppingList.filter(id => id !== ingredientId);
        this.loadShoppingList();
    }

    shareShoppingList() {
        this.showToast('Share functionality would open share options', 'info');
    }

    showCloneModal(recipeId) {
        if (!recipeId && !this.selectedRecipe) return;
        
        const recipe = this.selectedRecipe;
        if (!recipe) return;

        const modalContent = `
            <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Clone & Modify Recipe</h2>
                    <button onclick="app.hideCloneModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <form id="cloneForm" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Recipe Title</label>
                            <input type="text" id="cloneTitle" value="${recipe.title} (Copy)" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Servings</label>
                            <input type="number" id="cloneServings" value="${recipe.servings || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Prep Time (minutes)</label>
                            <input type="number" id="clonePrepTime" value="${recipe.prep_time_minutes || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Cook Time (minutes)</label>
                            <input type="number" id="cloneCookTime" value="${recipe.cook_time_minutes || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea id="cloneDescription" rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">${recipe.description}</textarea>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 class="text-lg font-semibold mb-4">Ingredients</h3>
                            <div id="cloneIngredients" class="space-y-3">
                                ${recipe.ingredients.map((ing, index) => `
                                    <div class="ingredient-row grid grid-cols-12 gap-2 items-center">
                                        <div class="col-span-3">
                                            <input type="text" value="${ing.quantity}" placeholder="Quantity" 
                                                   class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                                        </div>
                                        <div class="col-span-4">
                                            <input type="text" value="${ing.name}" placeholder="Ingredient" 
                                                   class="w-full px-2 py-1 border border-gray-300 rounded text-sm" required>
                                        </div>
                                        <div class="col-span-2">
                                            <input type="text" value="${ing.brand || ''}" placeholder="Brand" 
                                                   class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                                        </div>
                                        <div class="col-span-2">
                                            <input type="number" value="${ing.price || ''}" placeholder="Price" step="0.01" 
                                                   class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                                        </div>
                                        <div class="col-span-1">
                                            <button type="button" onclick="this.closest('.ingredient-row').remove()" 
                                                    class="text-red-500 hover:text-red-700">
                                                <i class="fas fa-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" onclick="app.addIngredientRow()" 
                                    class="mt-3 text-orange-500 hover:text-orange-700 text-sm">
                                <i class="fas fa-plus mr-1"></i>Add Ingredient
                            </button>
                        </div>

                        <div>
                            <h3 class="text-lg font-semibold mb-4">Instructions</h3>
                            <div id="cloneInstructions" class="space-y-3">
                                ${recipe.instructions.map((inst, index) => `
                                    <div class="instruction-row grid grid-cols-12 gap-2 items-start">
                                        <div class="col-span-1 text-center">
                                            <span class="w-6 h-6 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center">
                                                ${index + 1}
                                            </span>
                                        </div>
                                        <div class="col-span-8">
                                            <textarea rows="2" placeholder="Instruction description" 
                                                      class="w-full px-2 py-1 border border-gray-300 rounded text-sm" required>${inst.description}</textarea>
                                        </div>
                                        <div class="col-span-2">
                                            <input type="text" value="${inst.timeframe || ''}" placeholder="Time" 
                                                   class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                                        </div>
                                        <div class="col-span-1">
                                            <button type="button" onclick="this.closest('.instruction-row').remove(); app.renumberInstructions()" 
                                                    class="text-red-500 hover:text-red-700">
                                                <i class="fas fa-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" onclick="app.addInstructionRow()" 
                                    class="mt-3 text-orange-500 hover:text-orange-700 text-sm">
                                <i class="fas fa-plus mr-1"></i>Add Instruction
                            </button>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button type="button" onclick="app.hideCloneModal()" 
                                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                            <i class="fas fa-copy mr-2"></i>Clone Recipe
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('cloneModalContent').innerHTML = modalContent;
        document.getElementById('cloneModal').classList.add('show');

        // Add form submit handler
        document.getElementById('cloneForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitCloneForm(recipe.id);
        });
    }

    hideCloneModal() {
        document.getElementById('cloneModal').classList.remove('show');
    }

    addIngredientRow() {
        const container = document.getElementById('cloneIngredients');
        const newRow = document.createElement('div');
        newRow.className = 'ingredient-row grid grid-cols-12 gap-2 items-center';
        newRow.innerHTML = `
            <div class="col-span-3">
                <input type="text" placeholder="Quantity" 
                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
            </div>
            <div class="col-span-4">
                <input type="text" placeholder="Ingredient" 
                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm" required>
            </div>
            <div class="col-span-2">
                <input type="text" placeholder="Brand" 
                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
            </div>
            <div class="col-span-2">
                <input type="number" placeholder="Price" step="0.01" 
                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
            </div>
            <div class="col-span-1">
                <button type="button" onclick="this.closest('.ingredient-row').remove()" 
                        class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
        `;
        container.appendChild(newRow);
    }

    addInstructionRow() {
        const container = document.getElementById('cloneInstructions');
        const instructionCount = container.children.length + 1;
        const newRow = document.createElement('div');
        newRow.className = 'instruction-row grid grid-cols-12 gap-2 items-start';
        newRow.innerHTML = `
            <div class="col-span-1 text-center">
                <span class="w-6 h-6 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center">
                    ${instructionCount}
                </span>
            </div>
            <div class="col-span-8">
                <textarea rows="2" placeholder="Instruction description" 
                          class="w-full px-2 py-1 border border-gray-300 rounded text-sm" required></textarea>
            </div>
            <div class="col-span-2">
                <input type="text" placeholder="Time" 
                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
            </div>
            <div class="col-span-1">
                <button type="button" onclick="this.closest('.instruction-row').remove(); app.renumberInstructions()" 
                        class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
        `;
        container.appendChild(newRow);
    }

    renumberInstructions() {
        const instructions = document.querySelectorAll('.instruction-row');
        instructions.forEach((row, index) => {
            const numberSpan = row.querySelector('span');
            if (numberSpan) {
                numberSpan.textContent = index + 1;
            }
        });
    }

    async submitCloneForm(originalRecipeId) {
        try {
            const form = document.getElementById('cloneForm');
            const formData = new FormData(form);
            
            // Collect basic recipe data
            const cloneData = {
                title: document.getElementById('cloneTitle').value,
                description: document.getElementById('cloneDescription').value,
                servings: parseInt(document.getElementById('cloneServings').value) || null,
                prep_time_minutes: parseInt(document.getElementById('clonePrepTime').value) || null,
                cook_time_minutes: parseInt(document.getElementById('cloneCookTime').value) || null,
                ingredients: [],
                instructions: []
            };

            // Collect ingredients
            const ingredientRows = document.querySelectorAll('.ingredient-row');
            ingredientRows.forEach((row, index) => {
                const inputs = row.querySelectorAll('input');
                if (inputs[1].value.trim()) { // Only add if ingredient name is not empty
                    cloneData.ingredients.push({
                        quantity: inputs[0].value,
                        name: inputs[1].value,
                        brand: inputs[2].value,
                        price: inputs[3].value || null,
                        order: index + 1
                    });
                }
            });

            // Collect instructions
            const instructionRows = document.querySelectorAll('.instruction-row');
            instructionRows.forEach((row, index) => {
                const textarea = row.querySelector('textarea');
                const timeInput = row.querySelector('input[type="text"]');
                if (textarea.value.trim()) { // Only add if description is not empty
                    cloneData.instructions.push({
                        description: textarea.value,
                        timeframe: timeInput.value,
                        order: index + 1
                    });
                }
            });

            const response = await fetch(`/api/recipes/${originalRecipeId}/clone/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cloneData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to clone recipe');
            }

            const clonedRecipe = await response.json();
            this.showToast('Recipe cloned successfully!', 'success');
            this.hideCloneModal();
            this.loadRecipes();
        } catch (error) {
            this.showToast(error.message, 'error');
            console.error('Error cloning recipe:', error);
        }
    }

    async deleteRecipe(recipeId) {
        if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/recipes/${recipeId}/delete/`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete recipe');
            }

            this.showToast('Recipe deleted successfully!', 'success');
            this.hideRecipeModal();
            this.loadRecipes();
        } catch (error) {
            this.showToast(error.message, 'error');
            console.error('Error deleting recipe:', error);
        }
    }

    showLoading() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('recipeGrid').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loadingState').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        
        const bgColors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        };

        toast.className = `${bgColors[type]} text-white px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        toast.textContent = message;

        container.appendChild(toast);

        // Slide in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Slide out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    async showRevisionHistory(recipeId) {
        try {
            const response = await fetch(`/api/recipes/${recipeId}/revisions/`);
            if (!response.ok) throw new Error('Failed to load revision history');
            
            const data = await response.json();
            const { recipe_id, current_title, revisions } = data;
            
            const modalContent = `
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Revision History: ${current_title}</h2>
                    <button onclick="app.hideRevisionModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                ${revisions.length === 0 ? `
                    <p class="text-gray-500 text-center py-8">No revision history available for this recipe.</p>
                ` : `
                    <div class="space-y-4">
                        ${revisions.map(revision => `
                            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer" 
                                 onclick="app.showRevisionDetails(${recipe_id}, ${revision.revision_number})">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <h3 class="font-semibold text-lg">Revision ${revision.revision_number}</h3>
                                        <p class="text-gray-600 mt-1">${revision.title}</p>
                                        ${revision.change_summary ? `
                                            <p class="text-sm text-gray-500 mt-2">
                                                <i class="fas fa-info-circle mr-1"></i>${revision.change_summary}
                                            </p>
                                        ` : ''}
                                        <div class="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                                            <span><i class="fas fa-calendar mr-1"></i>${new Date(revision.created_at).toLocaleDateString()}</span>
                                            <span><i class="fas fa-utensils mr-1"></i>${revision.ingredients_count} ingredients</span>
                                            <span><i class="fas fa-list mr-1"></i>${revision.instructions_count} steps</span>
                                        </div>
                                    </div>
                                    <i class="fas fa-chevron-right text-gray-400"></i>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            `;
            
            document.getElementById('revisionContent').innerHTML = modalContent;
            document.getElementById('revisionModal').classList.add('show');
            
        } catch (error) {
            this.showToast('Failed to load revision history', 'error');
            console.error('Error loading revisions:', error);
        }
    }

    hideRevisionModal() {
        document.getElementById('revisionModal').classList.remove('show');
    }

    async showRevisionDetails(recipeId, revisionNumber) {
        try {
            const response = await fetch(`/api/recipes/${recipeId}/revisions/${revisionNumber}/`);
            if (!response.ok) throw new Error('Failed to load revision details');
            
            const revision = await response.json();
            
            const modalContent = `
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-bold">Revision ${revision.revision_number}: ${revision.title}</h2>
                        <p class="text-gray-600 mt-1">Created on ${new Date(revision.created_at).toLocaleString()}</p>
                    </div>
                    <button onclick="app.showRevisionHistory(${recipeId})" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-arrow-left text-xl"></i> Back to History
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Recipe Details -->
                    <div>
                        <h3 class="font-semibold text-lg mb-3">Recipe Details</h3>
                        <div class="space-y-2 text-sm">
                            <p><strong>Description:</strong> ${revision.description || 'No description'}</p>
                            <p><strong>Prep Time:</strong> ${revision.prep_time_minutes || 0} minutes</p>
                            <p><strong>Cook Time:</strong> ${revision.cook_time_minutes || 0} minutes</p>
                            <p><strong>Servings:</strong> ${revision.servings || 'Not specified'}</p>
                            ${revision.change_summary ? `
                                <p><strong>Change Summary:</strong> ${revision.change_summary}</p>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Ingredients -->
                    <div>
                        <h3 class="font-semibold text-lg mb-3">Ingredients</h3>
                        <ul class="space-y-1 text-sm">
                            ${revision.ingredients.map(ing => `
                                <li>${ing.quantity} ${ing.name}${ing.brand ? ` (${ing.brand})` : ''}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                
                <!-- Instructions -->
                <div class="mt-6">
                    <h3 class="font-semibold text-lg mb-3">Instructions</h3>
                    <ol class="space-y-2">
                        ${revision.instructions.map((inst, idx) => `
                            <li class="flex space-x-3">
                                <span class="font-semibold">${idx + 1}.</span>
                                <span>${inst.description}${inst.timeframe ? ` (${inst.timeframe})` : ''}</span>
                            </li>
                        `).join('')}
                    </ol>
                </div>
            `;
            
            document.getElementById('revisionContent').innerHTML = modalContent;
            
        } catch (error) {
            this.showToast('Failed to load revision details', 'error');
            console.error('Error loading revision details:', error);
        }
    }
}

// Initialize the app
const app = new RecipeApp();