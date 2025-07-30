// Recipe Chat Assistant
class ChatAssistant {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.recipeId = this.getRecipeIdFromUrl();
        this.init();
    }

    init() {
        this.createChatUI();
        this.bindEvents();
        this.loadChatHistory();
    }

    getRecipeIdFromUrl() {
        const match = window.location.pathname.match(/\/recipe\/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    createChatUI() {
        // Create chat container
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chat-assistant';
        chatContainer.className = 'fixed bottom-4 right-4 z-50';
        chatContainer.innerHTML = `
            <!-- Chat Toggle Button -->
            <button id="chat-toggle" class="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 transform hover:scale-110">
                <i class="fas fa-comment-alt text-xl"></i>
            </button>
            
            <!-- Chat Window -->
            <div id="chat-window" class="hidden bg-white rounded-lg shadow-2xl mb-4 w-96 max-h-[600px] flex flex-col">
                <!-- Chat Header -->
                <div class="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-robot mr-2"></i>
                        <h3 class="font-semibold">Recipe Assistant</h3>
                    </div>
                    <button id="chat-close" class="hover:bg-blue-700 rounded p-1">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Chat Messages -->
                <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
                    <div class="text-center text-gray-500 text-sm">
                        <p>Hi! I'm your cooking assistant. I can help you:</p>
                        <ul class="mt-2 text-left space-y-1">
                            <li>• Modify recipes and suggest alternatives</li>
                            <li>• Search for new recipes online</li>
                            <li>• Create shopping lists</li>
                            <li>• Answer cooking questions</li>
                        </ul>
                    </div>
                </div>
                
                <!-- Chat Input -->
                <div class="border-t px-4 py-3">
                    <div class="flex items-center space-x-2">
                        <input 
                            id="chat-input" 
                            type="text" 
                            placeholder="Ask me anything about recipes..."
                            class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxlength="500"
                        />
                        <button id="chat-send" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span id="char-count">0/500</span>
                        <button id="clear-chat" class="hover:text-red-600">
                            <i class="fas fa-trash mr-1"></i>Clear chat
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(chatContainer);
    }

    bindEvents() {
        // Toggle chat window
        document.getElementById('chat-toggle').addEventListener('click', () => this.toggleChat());
        document.getElementById('chat-close').addEventListener('click', () => this.toggleChat());
        
        // Send message
        document.getElementById('chat-send').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Character count
        document.getElementById('chat-input').addEventListener('input', (e) => {
            document.getElementById('char-count').textContent = `${e.target.value.length}/500`;
        });
        
        // Clear chat
        document.getElementById('clear-chat').addEventListener('click', () => this.clearChat());
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('chat-window');
        const chatToggle = document.getElementById('chat-toggle');
        
        if (this.isOpen) {
            chatWindow.classList.remove('hidden');
            chatToggle.classList.add('hidden');
            document.getElementById('chat-input').focus();
        } else {
            chatWindow.classList.add('hidden');
            chatToggle.classList.remove('hidden');
        }
    }

    async loadChatHistory() {
        try {
            const url = this.recipeId 
                ? `/api/chat/history/?recipe_id=${this.recipeId}` 
                : '/api/chat/history/';
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                this.messages = data.messages || [];
                this.displayMessages();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    displayMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
        
        if (this.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="text-center text-gray-500 text-sm">
                    <p>Hi! I'm your cooking assistant. I can help you:</p>
                    <ul class="mt-2 text-left space-y-1">
                        <li>• Modify recipes and suggest alternatives</li>
                        <li>• Search for new recipes online</li>
                        <li>• Create shopping lists</li>
                        <li>• Answer cooking questions</li>
                    </ul>
                </div>
            `;
            return;
        }
        
        this.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`;
            
            const messageBubble = document.createElement('div');
            messageBubble.className = `max-w-[80%] px-4 py-2 rounded-lg ${
                msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
            }`;
            messageBubble.innerHTML = this.formatMessage(msg.content);
            
            messageDiv.appendChild(messageBubble);
            messagesContainer.appendChild(messageDiv);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatMessage(content) {
        // Convert line breaks to <br> and escape HTML
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Disable input while sending
        input.disabled = true;
        document.getElementById('chat-send').disabled = true;
        
        // Add user message to display
        this.messages.push({ role: 'user', content: message });
        this.displayMessages();
        
        // Clear input
        input.value = '';
        document.getElementById('char-count').textContent = '0/500';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await fetch('/api/chat/message/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    recipe_id: this.recipeId
                })
            });
            
            const data = await response.json();
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            if (data.success) {
                this.messages.push({ 
                    role: 'assistant', 
                    content: data.message 
                });
            } else {
                this.messages.push({ 
                    role: 'assistant', 
                    content: data.message || 'Sorry, I encountered an error. Please try again.' 
                });
            }
            
            this.displayMessages();
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.messages.push({ 
                role: 'assistant', 
                content: 'Sorry, I couldn\'t connect to the server. Please try again later.' 
            });
            this.displayMessages();
        } finally {
            // Re-enable input
            input.disabled = false;
            document.getElementById('chat-send').disabled = false;
            input.focus();
        }
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex justify-start';
        typingDiv.innerHTML = `
            <div class="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async clearChat() {
        if (!confirm('Are you sure you want to clear the chat history?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/chat/clear/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipe_id: this.recipeId
                })
            });
            
            if (response.ok) {
                this.messages = [];
                this.displayMessages();
                this.showToast('Chat history cleared', 'success');
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            this.showToast('Failed to clear chat history', 'error');
        }
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

// Initialize chat assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatAssistant = new ChatAssistant();
});