// Main JavaScript functions for the Restaurant Inventory System

// Global variables
let currentInventory = [];
let currentShipments = [];
let currentTransfers = [];

// Enhanced Notification System
class NotificationManager {
    constructor() {
        this.container = this.createContainer();
        document.body.appendChild(this.container);
    }
    
    createContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        container.id = 'notificationContainer';
        return container;
    }
    
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getIcon(type);
        notification.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div class="notification-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${this.getTitle(type)}</div>
                    <div style="font-size: 0.875rem; color: var(--gray-700);">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: var(--gray-400); font-size: 1.2rem; cursor: pointer; margin-left: 0.5rem;">
                    ×
                </button>
            </div>
        `;
        
        this.container.appendChild(notification);
        
        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutNotification 0.3s ease-in forwards';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
        
        return notification;
    }
    
    getIcon(type) {
        const icons = {
            'success': 'check',
            'error': 'times',
            'warning': 'exclamation',
            'info': 'info'
        };
        return icons[type] || 'info';
    }
    
    getTitle(type) {
        const titles = {
            'success': 'Success',
            'error': 'Error',
            'warning': 'Warning',
            'info': 'Information'
        };
        return titles[type] || 'Notification';
    }
}

// Initialize notification manager
const notifications = new NotificationManager();

// Loading Manager
class LoadingManager {
    static show(element, message = 'Loading...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        // Store original content
        element.dataset.originalContent = element.innerHTML;
        
        // Add loading overlay
        element.style.position = 'relative';
        element.innerHTML = `
            <div class="loading-overlay">
                <div style="text-align: center;">
                    <div class="loading-spinner"></div>
                    <div style="margin-top: 0.5rem; color: var(--gray-600); font-size: 0.875rem;">
                        ${message}
                    </div>
                </div>
            </div>
        `;
    }
    
    static hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element || !element.dataset.originalContent) return;
        
        // Restore original content
        element.innerHTML = element.dataset.originalContent;
        delete element.dataset.originalContent;
    }
    
    static showSkeleton(element, type = 'card') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.dataset.originalContent = element.innerHTML;
        
        let skeletonHTML = '';
        switch (type) {
            case 'table':
                skeletonHTML = this.createTableSkeleton();
                break;
            case 'card':
                skeletonHTML = this.createCardSkeleton();
                break;
            case 'stats':
                skeletonHTML = this.createStatsSkeleton();
                break;
            default:
                skeletonHTML = this.createDefaultSkeleton();
        }
        
        element.innerHTML = skeletonHTML;
    }
    
    static createTableSkeleton() {
        return `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            ${Array(5).fill('<th><div class="skeleton skeleton-text"></div></th>').join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${Array(8).fill(`
                            <tr>
                                ${Array(5).fill('<td><div class="skeleton skeleton-text"></div></td>').join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    static createCardSkeleton() {
        return `
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-text large" style="width: 80%;"></div>
            <div class="skeleton skeleton-text" style="width: 60%;"></div>
            <div class="skeleton skeleton-text" style="width: 90%;"></div>
        `;
    }
    
    static createStatsSkeleton() {
        return `
            <div class="skeleton skeleton-text large" style="width: 60px; height: 2rem; margin-bottom: 0.5rem;"></div>
            <div class="skeleton skeleton-text small" style="width: 80px;"></div>
        `;
    }
    
    static createDefaultSkeleton() {
        return `
            <div class="skeleton skeleton-text large"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width: 75%;"></div>
        `;
    }
}

// Enhanced showAlert function (backwards compatibility)
function showAlert(message, type = 'info', duration = 5000) {
    notifications.show(message, type, duration);
}

function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumber(number, decimals = 2) {
    return parseFloat(number).toFixed(decimals);
}

// API Functions
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Generic CRUD operations
async function loadData(endpoint) {
    try {
        const data = await apiRequest(endpoint);
        return data.success ? data.data : [];
    } catch (error) {
        showAlert(`Error loading data: ${error.message}`, 'danger');
        return [];
    }
}

async function createData(endpoint, data) {
    try {
        const result = await apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (result.success) {
            showAlert('Item created successfully!', 'success');
            return result;
        } else {
            throw new Error(result.error || 'Failed to create item');
        }
    } catch (error) {
        showAlert(`Error creating item: ${error.message}`, 'danger');
        throw error;
    }
}

async function updateData(endpoint, data) {
    try {
        const result = await apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        if (result.success) {
            showAlert('Item updated successfully!', 'success');
            return result;
        } else {
            throw new Error(result.error || 'Failed to update item');
        }
    } catch (error) {
        showAlert(`Error updating item: ${error.message}`, 'danger');
        throw error;
    }
}

async function deleteData(endpoint) {
    try {
        const result = await apiRequest(endpoint, {
            method: 'DELETE'
        });
        
        if (result.success) {
            showAlert('Item deleted successfully!', 'success');
            return result;
        } else {
            throw new Error(result.error || 'Failed to delete item');
        }
    } catch (error) {
        showAlert(`Error deleting item: ${error.message}`, 'danger');
        throw error;
    }
}

// Form validation
function validateForm(formId, requiredFields) {
    const form = document.getElementById(formId);
    let isValid = true;
    
    // Remove previous validation classes
    form.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
    
    // Check required fields
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        }
    });
    
    return isValid;
}

// Form reset
function resetForm(formId) {
    const form = document.getElementById(formId);
    form.reset();
    
    // Remove validation classes
    form.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
}

// Modal helpers
function showModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

function hideModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) {
        modal.hide();
    }
}

// Search and filter functions
function searchTable(tableId, searchTerm) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

function filterTable(tableId, columnIndex, filterValue) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const cell = row.cells[columnIndex];
        if (!cell) return;
        
        const cellValue = cell.textContent.trim();
        row.style.display = !filterValue || cellValue === filterValue ? '' : 'none';
    });
}

// Loading state management
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }
}

function hideLoading(containerId) {
    // This is handled by replacing content, so no specific action needed
}

// Confirmation dialogs
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Initialize tooltips and popovers
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize Bootstrap popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
});

// Export functions
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }
    
    const csvContent = convertToCSV(data);
    downloadCSV(csvContent, filename);
}

function convertToCSV(data) {
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in values
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
        }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}