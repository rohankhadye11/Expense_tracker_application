// script.js - Expense Tracker Frontend Logic

// API ENDPOINTS - Replace with your Cloud Function URLs
const API_ENDPOINTS = {
    // Replace these with your actual Cloud Function HTTP trigger URLs
    addExpense: 'https://asia-south1-plasma-creek-462204-r2.cloudfunctions.net/addExpense',
    deleteExpense: 'https://asia-south1-plasma-creek-462204-r2.cloudfunctions.net/deleteexpense', 
    getExpenses: 'https://asia-south1-plasma-creek-462204-r2.cloudfunctions.net/getexpense'
};

// Check if API endpoints are configured
function checkAPIEndpoints() {
    const isConfigured = !Object.values(API_ENDPOINTS).some(url => 
        url.includes('YOUR_') || url === '' || url === null
    );
    
    if (!isConfigured) {
        console.error('❌ API endpoints not configured!');
        console.log('Please update the API_ENDPOINTS object with your actual Cloud Function URLs');
        showError('API endpoints not configured. Please check the console for details.');
        return false;
    }
    
    console.log('✅ API endpoints configured');
    return true;
}

// DOM ELEMENTS
const expenseForm = document.getElementById('expense-form');
const expensesList = document.getElementById('expenses-list');
const totalAmountElement = document.getElementById('total-amount');
const loadingElement = document.getElementById('loading');
const errorMessageElement = document.getElementById('error-message');
const noExpensesElement = document.getElementById('no-expenses');

// Form input elements
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');

// UTILITY FUNCTIONS

/**
 * Display error message to user
 */
function showError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block';
    setTimeout(() => {
        errorMessageElement.style.display = 'none';
    }, 8000); // Increased timeout for longer messages
}

/**
 * Display success message to user
 */
function showSuccess(message) {
    // Create success message element if it doesn't exist
    let successElement = document.getElementById('success-message');
    if (!successElement) {
        successElement = document.createElement('div');
        successElement.id = 'success-message';
        successElement.className = 'success-message';
        successElement.style.cssText = `
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #c3e6cb;
            display: none;
        `;
        errorMessageElement.parentNode.insertBefore(successElement, errorMessageElement);
    }
    
    successElement.textContent = message;
    successElement.style.display = 'block';
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 4000);
}

/**
 * Show/hide loading indicator
 */
function toggleLoading(show) {
    loadingElement.style.display = show ? 'block' : 'none';
}

/**
 * Format currency for display (Indian Rupees)
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Calculate and update total amount
 */
function updateTotalAmount(expenses) {
    const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    totalAmountElement.textContent = `Total: ${formatCurrency(total)}`;
}

// CRUD OPERATIONS

/**
 * Fetch and display all expenses
 */
async function fetchAndDisplayExpenses() {
    try {
        // Check if API endpoints are configured
        if (!checkAPIEndpoints()) {
            return;
        }
        
        toggleLoading(true);
        errorMessageElement.style.display = 'none';
        
        console.log('📡 Fetching expenses from:', API_ENDPOINTS.getExpenses);
        
        const response = await fetch(API_ENDPOINTS.getExpenses, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('📊 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const expenses = await response.json();
        console.log('✅ Expenses fetched:', expenses);
        
        displayExpenses(expenses);
        updateTotalAmount(expenses);
        
    } catch (error) {
        console.error('❌ Error fetching expenses:', error);
        
        // More detailed error messages
        if (error.message.includes('Failed to fetch')) {
            showError('Network error: Unable to connect to server. Please check your internet connection and API endpoints.');
        } else if (error.message.includes('CORS')) {
            showError('CORS error: Please ensure your Cloud Function has proper CORS headers set.');
        } else {
            showError(`Failed to load expenses: ${error.message}`);
        }
    } finally {
        toggleLoading(false);
    }
}

/**
 * Add a new expense
 */
async function addExpense(expenseData) {
    try {
        // Check if API endpoints are configured
        if (!checkAPIEndpoints()) {
            return;
        }
        
        toggleLoading(true);
        errorMessageElement.style.display = 'none';
        
        console.log('🚀 Adding expense:', expenseData);
        console.log('📡 API URL:', API_ENDPOINTS.addExpense);
        
        const response = await fetch(API_ENDPOINTS.addExpense, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(expenseData)
        });

        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Expense added successfully:', result);
        
        // Refresh the expenses list
        await fetchAndDisplayExpenses();
        
        // Reset the form
        expenseForm.reset();
        
        // Set today's date as default
        dateInput.value = new Date().toISOString().split('T')[0];
        
        // Show success message
        showSuccess('Expense added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding expense:', error);
        
        // More detailed error messages
        if (error.message.includes('Failed to fetch')) {
            showError('Network error: Unable to connect to server. Please check your internet connection and API endpoints.');
        } else if (error.message.includes('CORS')) {
            showError('CORS error: Please ensure your Cloud Function has proper CORS headers set.');
        } else {
            showError(`Failed to add expense: ${error.message}`);
        }
    } finally {
        toggleLoading(false);
    }
}

/**
 * Delete an expense by ID
 */
async function deleteExpense(expenseId) {
    // ... (rest of the code) ...
        const response = await fetch(API_ENDPOINTS.deleteExpense, { // CORRECT: No query param here
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expense_id: expenseId }) // CORRECT: JSON body is included
        });
    // ... (rest of the code) ...
}

// DOM MANIPULATION

/**
 * Display expenses in the DOM
 */
function displayExpenses(expenses) {
    // Clear existing expenses
    expensesList.innerHTML = '';
    
    if (!expenses || expenses.length === 0) {
        noExpensesElement.style.display = 'block';
        return;
    }
    
    noExpensesElement.style.display = 'none';
    
    // Sort expenses by date (newest first)
    const sortedExpenses = expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedExpenses.forEach(expense => {
        const expenseElement = createExpenseElement(expense);
        expensesList.appendChild(expenseElement);
    });
}

/**
 * Create a single expense element
 */
function createExpenseElement(expense) {
    const expenseDiv = document.createElement('div');
    expenseDiv.className = 'expense-item';
    expenseDiv.setAttribute('data-expense-id', expense.expense_id); // Changed to expense.expense_id

    expenseDiv.innerHTML = `
        <div class="expense-details">
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
            <div class="expense-category ${expense.category}">${expense.category}</div>
            <div class="expense-description">${expense.description}</div>
            <div class="expense-date">${formatDate(expense.date)}</div>
        </div>
        <div class="expense-actions">
            <button class="btn btn-danger delete-btn" data-expense-id="${expense.expense_id}">
                Delete
            </button>
        </div>
    `;

    return expenseDiv;
}

// EVENT HANDLERS

/**
 * Handle form submission
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const expenseData = {
        amount: parseFloat(amountInput.value),
        category: categoryInput.value,
        date: dateInput.value,
        description: descriptionInput.value.trim()
    };
    
    // Basic validation
    if (!expenseData.amount || expenseData.amount <= 0) {
        showError('Please enter a valid amount.');
        return;
    }
    
    if (!expenseData.category) {
        showError('Please select a category.');
        return;
    }
    
    if (!expenseData.date) {
        showError('Please select a date.');
        return;
    }
    
    if (!expenseData.description) {
        showError('Please enter a description.');
        return;
    }
    
    // Add the expense
    addExpense(expenseData);
}

/**
 * Handle delete button clicks (using event delegation)
 */
function handleDeleteClick(event) {
    if (event.target.classList.contains('delete-btn')) {
        const expenseId = event.target.getAttribute('data-expense-id');
        deleteExpense(expenseId);
    }
}

// INITIALIZATION

/**
 * Initialize the application
 */
function initializeApp() {
    // Set today's date as default
    dateInput.value = new Date().toISOString().split('T')[0];
    
    // Add event listeners
    expenseForm.addEventListener('submit', handleFormSubmit);
    expensesList.addEventListener('click', handleDeleteClick);
    
    // Check API configuration
    console.log('🔧 Initializing Expense Tracker...');
    console.log('📋 Current API Endpoints:', API_ENDPOINTS);
    
    if (checkAPIEndpoints()) {
        // Load initial expenses only if API is configured
        fetchAndDisplayExpenses();
    } else {
        // Show setup instructions
        showError('Please configure your API endpoints in the JavaScript file before using the app.');
    }
    
    console.log('✅ Expense Tracker initialized!');
}

// START THE APPLICATION

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// ADDITIONAL FEATURES (Optional)

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter to submit form
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (document.activeElement.closest('#expense-form')) {
            event.preventDefault();
            expenseForm.dispatchEvent(new Event('submit'));
        }
    }
});

/**
 * Auto-focus amount input when page loads
 */
window.addEventListener('load', function() {
    amountInput.focus();
});

// DEVELOPMENT HELPERS

// In development, you can call these functions from the browser console
window.expenseTracker = {
    fetchAndDisplayExpenses,
    addExpense,
    deleteExpense,
    API_ENDPOINTS
};