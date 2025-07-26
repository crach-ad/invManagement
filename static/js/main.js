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

// Mobile Touch Interaction Manager
class MobileInteractionManager {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isMobile = window.innerWidth <= 768;
        this.init();
    }
    
    init() {
        if (!this.isMobile) return;
        
        this.setupSwipeGestures();
        this.setupPullToRefresh();
        this.setupTouchFeedback();
        this.setupMobileTooltips();
        this.setupKeyboardHandling();
        
        // Re-initialize on window resize
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        });
    }
    
    setupSwipeGestures() {
        let startX, startY, startTime;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (e.changedTouches.length !== 1) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const deltaTime = endTime - startTime;
            
            // Check if it's a swipe (fast enough and long enough)
            if (deltaTime < 300 && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
                this.handleSwipe(deltaX > 0 ? 'right' : 'left', e.target);
            }
        }, { passive: true });
    }
    
    handleSwipe(direction, target) {
        // Handle table row swipes for quick actions
        const row = target.closest('tr');
        if (row && row.closest('.table')) {
            this.handleTableRowSwipe(row, direction);
            return;
        }
        
        // Handle sidebar swipe
        if (direction === 'right' && window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && !sidebar.classList.contains('mobile-open')) {
                document.getElementById('mobileMenuBtn')?.click();
            }
        }
    }
    
    handleTableRowSwipe(row, direction) {
        row.classList.remove('swipe-left', 'swipe-right');
        
        if (direction === 'left') {
            row.classList.add('swipe-left');
            this.showRowActions(row, 'left');
        } else {
            row.classList.add('swipe-right');
            this.showRowActions(row, 'right');
        }
        
        // Reset after 3 seconds
        setTimeout(() => {
            row.classList.remove('swipe-left', 'swipe-right');
        }, 3000);
    }
    
    showRowActions(row, direction) {
        const itemId = row.dataset.itemId;
        if (!itemId) return;
        
        const actions = direction === 'left' 
            ? '<i class="fas fa-trash text-danger"></i> Delete'
            : '<i class="fas fa-edit text-primary"></i> Edit';
            
        this.showMobileTooltip(`Swipe to ${direction === 'left' ? 'delete' : 'edit'} item`, 2000);
    }
    
    setupPullToRefresh() {
        let startY = 0;
        let isRefreshing = false;
        let refreshIndicator = null;
        
        const createRefreshIndicator = () => {
            if (refreshIndicator) return refreshIndicator;
            
            refreshIndicator = document.createElement('div');
            refreshIndicator.className = 'pull-to-refresh';
            refreshIndicator.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Pull to refresh';
            document.body.appendChild(refreshIndicator);
            return refreshIndicator;
        };
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (isRefreshing || window.scrollY > 0) return;
            
            const currentY = e.touches[0].clientY;
            const diffY = currentY - startY;
            
            if (diffY > 60) {
                const indicator = createRefreshIndicator();
                indicator.classList.add('active');
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (isRefreshing) return;
            
            const indicator = document.querySelector('.pull-to-refresh');
            if (indicator && indicator.classList.contains('active')) {
                isRefreshing = true;
                indicator.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Refreshing...';
                
                // Simulate refresh
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        }, { passive: true });
    }
    
    setupTouchFeedback() {
        // Add haptic feedback simulation for buttons
        document.addEventListener('touchstart', (e) => {
            const button = e.target.closest('.btn, .nav-item, .card');
            if (button) {
                button.classList.add('haptic-feedback');
                setTimeout(() => {
                    button.classList.remove('haptic-feedback');
                }, 100);
            }
        }, { passive: true });
    }
    
    setupMobileTooltips() {
        // Replace desktop tooltips with mobile-friendly tooltips
        document.addEventListener('click', (e) => {
            if (!this.isMobile) return;
            
            const element = e.target.closest('[title], [data-bs-title]');
            if (element) {
                e.preventDefault();
                const title = element.getAttribute('title') || element.getAttribute('data-bs-title');
                if (title) {
                    this.showMobileTooltip(title);
                }
            }
        });
    }
    
    showMobileTooltip(message, duration = 3000) {
        // Remove existing tooltip
        const existing = document.querySelector('.mobile-tooltip');
        if (existing) {
            existing.remove();
        }
        
        const tooltip = document.createElement('div');
        tooltip.className = 'mobile-tooltip';
        tooltip.textContent = message;
        document.body.appendChild(tooltip);
        
        // Animate in
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            tooltip.classList.remove('show');
            setTimeout(() => {
                tooltip.remove();
            }, 300);
        }, duration);
    }
    
    setupKeyboardHandling() {
        // Prevent zoom on input focus for iOS
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                if (input.type !== 'range') {
                    input.style.fontSize = '16px';
                }
            });
        });
        
        // Handle virtual keyboard
        let initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDiff = initialViewportHeight - currentHeight;
            
            // If keyboard is likely open (height reduced significantly)
            if (heightDiff > 150) {
                document.body.classList.add('keyboard-open');
            } else {
                document.body.classList.remove('keyboard-open');
            }
        });
    }
}

// Initialize mobile interactions
let mobileManager;
document.addEventListener('DOMContentLoaded', () => {
    mobileManager = new MobileInteractionManager();
});

// Keyboard Shortcuts and Tooltips Manager
class KeyboardShortcutsManager {
    constructor() {
        this.shortcuts = {
            // Global shortcuts
            'ctrl+k': () => this.focusSearch(),
            'ctrl+shift+n': () => this.openAddItemModal(),
            'ctrl+shift+r': () => this.refreshData(),
            'escape': () => this.closeModalsAndDropdowns(),
            'ctrl+shift+d': () => this.toggleDebugMode(),
            'ctrl+shift+h': () => this.showKeyboardHelp(),
            
            // Navigation shortcuts
            'ctrl+1': () => this.navigateTo('/'),
            'ctrl+2': () => this.navigateTo('/inventory'),
            'ctrl+3': () => this.navigateTo('/shipments'),
            'ctrl+4': () => this.navigateTo('/transfers'),
            'ctrl+5': () => this.navigateTo('/reports'),
            
            // Dashboard shortcuts
            'ctrl+shift+s': () => this.loadSampleData(),
            'ctrl+shift+c': () => this.clearAllFilters(),
        };
        
        this.tooltips = new Map();
        this.init();
    }
    
    init() {
        this.setupKeyboardListeners();
        this.setupTooltips();
        this.addKeyboardIndicators();
    }
    
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            const key = this.getKeyboardShortcut(e);
            
            if (this.shortcuts[key]) {
                // Don't interfere with normal typing in inputs
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    // Only allow escape and ctrl+k in inputs
                    if (key !== 'escape' && key !== 'ctrl+k') {
                        return;
                    }
                }
                
                e.preventDefault();
                this.shortcuts[key]();
            }
        });
    }
    
    getKeyboardShortcut(e) {
        const parts = [];
        
        if (e.ctrlKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');
        if (e.metaKey) parts.push('meta');
        
        parts.push(e.key.toLowerCase());
        
        return parts.join('+');
    }
    
    setupTooltips() {
        // Add tooltips with keyboard shortcuts to relevant elements
        this.addTooltip('[href="/inventory"]', 'Inventory (Ctrl+2)');
        this.addTooltip('[href="/shipments"]', 'Shipments (Ctrl+3)');
        this.addTooltip('[href="/transfers"]', 'Transfers (Ctrl+4)');
        this.addTooltip('[href="/reports"]', 'Reports (Ctrl+5)');
        this.addTooltip('#globalSearch', 'Search inventory (Ctrl+K)');
        this.addTooltip('#populateDemoBtn', 'Load sample data (Ctrl+Shift+S)');
        this.addTooltip('.notification-bell', 'Notifications');
        this.addTooltip('[data-bs-toggle="modal"]', 'Add new item (Ctrl+Shift+N)');
        
        // Setup tooltip display on hover
        document.addEventListener('mouseenter', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.showTooltip(e.target, e.target.getAttribute('data-tooltip'));
            }
        }, true);
        
        document.addEventListener('mouseleave', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.hideTooltip(e.target);
            }
        }, true);
    }
    
    addTooltip(selector, text) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.setAttribute('data-tooltip', text);
            element.style.position = 'relative';
        });
    }
    
    showTooltip(element, text) {
        if (window.innerWidth <= 768) return; // Skip on mobile
        
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = text;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        
        // Adjust if tooltip goes off screen
        if (top < 10) {
            top = rect.bottom + 8;
            tooltip.classList.add('bottom');
        }
        
        if (left < 10) {
            left = 10;
        } else if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
        
        // Animate in
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 10);
        
        this.tooltips.set(element, tooltip);
    }
    
    hideTooltip(element) {
        const tooltip = this.tooltips.get(element);
        if (tooltip) {
            tooltip.classList.remove('show');
            setTimeout(() => {
                tooltip.remove();
            }, 200);
            this.tooltips.delete(element);
        }
    }
    
    addKeyboardIndicators() {
        // Add subtle keyboard shortcut indicators to navigation
        const shortcuts = [
            { selector: '[href="/"]', key: '1' },
            { selector: '[href="/inventory"]', key: '2' },
            { selector: '[href="/shipments"]', key: '3' },
            { selector: '[href="/transfers"]', key: '4' },
            { selector: '[href="/reports"]', key: '5' }
        ];
        
        shortcuts.forEach(({ selector, key }) => {
            const element = document.querySelector(selector);
            if (element && !element.querySelector('.keyboard-hint')) {
                const hint = document.createElement('span');
                hint.className = 'keyboard-hint';
                hint.textContent = key;
                element.appendChild(hint);
            }
        });
    }
    
    // Shortcut actions
    focusSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    openAddItemModal() {
        const addButton = document.querySelector('[data-bs-toggle="modal"][data-bs-target="#addItemModal"]');
        if (addButton) {
            addButton.click();
        }
    }
    
    refreshData() {
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
        window.location.reload();
    }
    
    closeModalsAndDropdowns() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
        
        // Close notification dropdown
        const notificationDropdown = document.getElementById('notificationDropdown');
        if (notificationDropdown && notificationDropdown.classList.contains('show')) {
            notificationDropdown.classList.remove('show');
        }
        
        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
            document.getElementById('mobileCloseBtn')?.click();
        }
    }
    
    toggleDebugMode() {
        document.body.classList.toggle('debug-mode');
        const isDebug = document.body.classList.contains('debug-mode');
        notifications.show(`Debug mode ${isDebug ? 'enabled' : 'disabled'}`, 'info', 2000);
    }
    
    showKeyboardHelp() {
        const helpModal = document.createElement('div');
        helpModal.className = 'modal fade';
        helpModal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-keyboard me-2"></i>Keyboard Shortcuts
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Navigation</h6>
                                <div class="keyboard-shortcuts-list">
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>1</kbd>
                                        <span>Dashboard</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>2</kbd>
                                        <span>Inventory</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>3</kbd>
                                        <span>Shipments</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>4</kbd>
                                        <span>Transfers</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>5</kbd>
                                        <span>Reports</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h6>Actions</h6>
                                <div class="keyboard-shortcuts-list">
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>K</kbd>
                                        <span>Focus Search</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd>
                                        <span>Add New Item</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>
                                        <span>Refresh Data</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>
                                        <span>Load Sample Data</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Escape</kbd>
                                        <span>Close Modals</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd>
                                        <span>Show This Help</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(helpModal);
        const modal = new bootstrap.Modal(helpModal);
        modal.show();
        
        helpModal.addEventListener('hidden.bs.modal', () => {
            helpModal.remove();
        });
    }
    
    navigateTo(path) {
        window.location.href = path;
    }
    
    loadSampleData() {
        if (typeof populateDemoData === 'function') {
            populateDemoData();
        }
    }
    
    clearAllFilters() {
        if (typeof clearAllFilters === 'function') {
            clearAllFilters();
        }
    }
}

// Initialize keyboard shortcuts
let keyboardManager;
document.addEventListener('DOMContentLoaded', () => {
    keyboardManager = new KeyboardShortcutsManager();
});

// Enhanced Loading Manager with Branded Animations
class LoadingManager {
    static show(element, message = 'Loading...', type = 'default') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        // Store original content
        element.dataset.originalContent = element.innerHTML;
        
        // Add loading overlay with branded spinner
        element.style.position = 'relative';
        element.innerHTML = `
            <div class="loading-overlay branded-loading">
                <div class="loading-content">
                    ${this.getSpinner(type)}
                    <div class="loading-message">
                        ${message}
                    </div>
                </div>
            </div>
        `;
    }
    
    static getSpinner(type) {
        switch (type) {
            case 'branded':
                return `
                    <div class="branded-spinner">
                        <div class="spinner-logo">
                            <i class="fas fa-utensils"></i>
                        </div>
                        <div class="spinner-ring"></div>
                    </div>
                `;
            case 'dots':
                return `
                    <div class="dots-spinner">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                `;
            case 'pulse':
                return `
                    <div class="pulse-spinner">
                        <div class="pulse-circle"></div>
                    </div>
                `;
            default:
                return `
                    <div class="default-spinner">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                `;
        }
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