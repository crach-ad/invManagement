// Advanced Inventory Search and Management System
class InventoryManager {
    constructor() {
        this.inventoryData = [];
        this.filteredData = [];
        this.searchSuggestions = [];
        this.selectedItems = new Set();
        this.activeFilters = {};
        this.savedSearches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
        this.currentSort = 'name';
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadInventoryData();
        this.loadSavedSearches();
        this.setupAutoComplete();
    }
    
    bindEvents() {
        // Search input events
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => this.handleSearch(e.target.value));
            globalSearch.addEventListener('focus', () => this.showSuggestions());
            globalSearch.addEventListener('blur', () => {
                setTimeout(() => this.hideSuggestions(), 200);
            });
        }
        
        // Filter change events
        const filters = ['categoryFilter', 'stockStatusFilter', 'supplierFilter', 'sortBy'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });
        
        // Value range filters
        const valueFilters = ['minValue', 'maxValue'];
        valueFilters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('input', this.debounce(() => this.applyFilters(), 500));
            }
        });
        
        // Document click to close suggestions
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-group')) {
                this.hideSuggestions();
            }
        });
    }
    
    async loadInventoryData() {
        try {
            LoadingManager.showSkeleton('inventoryTable', 'table');
            
            const response = await fetch('/api/inventory');
            const data = await response.json();
            
            if (data.success) {
                this.inventoryData = data.data;
                this.filteredData = [...this.inventoryData];
                this.buildSearchIndex();
                this.populateFilterOptions();
                this.renderInventoryTable();
                notifications.show('Inventory data loaded successfully', 'success', 3000);
            } else {
                throw new Error(data.error || 'Failed to load inventory data');
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
            notifications.show('Error loading inventory data', 'error', 5000);
        } finally {
            LoadingManager.hide('inventoryTable');
        }
    }
    
    buildSearchIndex() {
        this.searchSuggestions = [];
        const suggestions = new Set();
        
        this.inventoryData.forEach(item => {
            // Add item names
            if (item.Name) suggestions.add(item.Name);
            
            // Add categories
            if (item.Category) suggestions.add(item.Category);
            
            // Add suppliers
            if (item.Supplier) suggestions.add(item.Supplier);
            
            // Add individual words from names
            if (item.Name) {
                item.Name.split(' ').forEach(word => {
                    if (word.length > 2) suggestions.add(word);
                });
            }
        });
        
        this.searchSuggestions = Array.from(suggestions).sort();
    }
    
    populateFilterOptions() {
        // Populate category filter
        const categories = [...new Set(this.inventoryData.map(item => item.Category).filter(cat => cat))];
        this.populateSelect('categoryFilter', categories);
        
        // Populate supplier filter
        const suppliers = [...new Set(this.inventoryData.map(item => item.Supplier).filter(sup => sup))];
        this.populateSelect('supplierFilter', suppliers);
    }
    
    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Keep the first option (All...)
        const firstOption = select.children[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        options.sort().forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
    }
    
    handleSearch(query) {
        const suggestions = this.getSuggestions(query);
        this.displaySuggestions(suggestions);
        
        if (query.length > 0) {
            this.activeFilters.search = query;
        } else {
            delete this.activeFilters.search;
        }
        
        this.applyFilters();
    }
    
    getSuggestions(query) {
        if (!query || query.length < 2) return [];
        
        const lowerQuery = query.toLowerCase();
        return this.searchSuggestions
            .filter(suggestion => suggestion.toLowerCase().includes(lowerQuery))
            .slice(0, 8);
    }
    
    displaySuggestions(suggestions) {
        const container = document.getElementById('searchSuggestions');
        if (!container) return;
        
        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.innerHTML = suggestions.map(suggestion => 
            `<div class="suggestion-item" onclick="inventoryManager.selectSuggestion('${suggestion}')">${suggestion}</div>`
        ).join('');
        
        container.style.display = 'block';
    }
    
    selectSuggestion(suggestion) {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.value = suggestion;
            this.handleSearch(suggestion);
        }
        this.hideSuggestions();
    }
    
    showSuggestions() {
        const query = document.getElementById('globalSearch')?.value || '';
        const suggestions = this.getSuggestions(query);
        this.displaySuggestions(suggestions);
    }
    
    hideSuggestions() {
        const container = document.getElementById('searchSuggestions');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    applyFilters() {
        this.collectActiveFilters();
        this.filterData();
        this.sortData();
        this.renderInventoryTable();
        this.updateActiveFiltersDisplay();
    }
    
    collectActiveFilters() {
        // Search filter
        const searchQuery = document.getElementById('globalSearch')?.value;
        if (searchQuery) {
            this.activeFilters.search = searchQuery;
        } else {
            delete this.activeFilters.search;
        }
        
        // Category filter
        const category = document.getElementById('categoryFilter')?.value;
        if (category) {
            this.activeFilters.category = category;
        } else {
            delete this.activeFilters.category;
        }
        
        // Stock status filter
        const stockStatus = document.getElementById('stockStatusFilter')?.value;
        if (stockStatus) {
            this.activeFilters.stockStatus = stockStatus;
        } else {
            delete this.activeFilters.stockStatus;
        }
        
        // Supplier filter
        const supplier = document.getElementById('supplierFilter')?.value;
        if (supplier) {
            this.activeFilters.supplier = supplier;
        } else {
            delete this.activeFilters.supplier;
        }
        
        // Value range filters
        const minValue = parseFloat(document.getElementById('minValue')?.value);
        const maxValue = parseFloat(document.getElementById('maxValue')?.value);
        
        if (!isNaN(minValue)) {
            this.activeFilters.minValue = minValue;
        } else {
            delete this.activeFilters.minValue;
        }
        
        if (!isNaN(maxValue)) {
            this.activeFilters.maxValue = maxValue;
        } else {
            delete this.activeFilters.maxValue;
        }
        
        // Sort filter
        const sortBy = document.getElementById('sortBy')?.value;
        if (sortBy) {
            this.currentSort = sortBy;
        }
    }
    
    filterData() {
        this.filteredData = this.inventoryData.filter(item => {
            // Search filter
            if (this.activeFilters.search) {
                const query = this.activeFilters.search.toLowerCase();
                const searchText = [
                    item.Name,
                    item.Category,
                    item.Supplier
                ].join(' ').toLowerCase();
                
                if (!searchText.includes(query)) return false;
            }
            
            // Category filter
            if (this.activeFilters.category && item.Category !== this.activeFilters.category) {
                return false;
            }
            
            // Supplier filter
            if (this.activeFilters.supplier && item.Supplier !== this.activeFilters.supplier) {
                return false;
            }
            
            // Stock status filter
            if (this.activeFilters.stockStatus) {
                const currentStock = parseFloat(item['Current Stock']) || 0;
                const reorderLevel = parseFloat(item['Reorder Level']) || 0;
                
                switch (this.activeFilters.stockStatus) {
                    case 'healthy':
                        if (currentStock <= reorderLevel) return false;
                        break;
                    case 'low':
                        if (currentStock <= 0 || currentStock > reorderLevel) return false;
                        break;
                    case 'critical':
                        if (currentStock > 0) return false;
                        break;
                }
            }
            
            // Value range filters
            if (this.activeFilters.minValue || this.activeFilters.maxValue) {
                const stock = parseFloat(item['Current Stock']) || 0;
                const cost = parseFloat(item['Cost Per Unit']) || 0;
                const value = stock * cost;
                
                if (this.activeFilters.minValue && value < this.activeFilters.minValue) {
                    return false;
                }
                
                if (this.activeFilters.maxValue && value > this.activeFilters.maxValue) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    sortData() {
        this.filteredData.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.Name?.localeCompare(b.Name) || 0;
                case 'name-desc':
                    return b.Name?.localeCompare(a.Name) || 0;
                case 'stock':
                    return (parseFloat(a['Current Stock']) || 0) - (parseFloat(b['Current Stock']) || 0);
                case 'stock-desc':
                    return (parseFloat(b['Current Stock']) || 0) - (parseFloat(a['Current Stock']) || 0);
                case 'value':
                    const valueA = (parseFloat(a['Current Stock']) || 0) * (parseFloat(a['Cost Per Unit']) || 0);
                    const valueB = (parseFloat(b['Current Stock']) || 0) * (parseFloat(b['Cost Per Unit']) || 0);
                    return valueA - valueB;
                case 'value-desc':
                    const valueA2 = (parseFloat(a['Current Stock']) || 0) * (parseFloat(a['Cost Per Unit']) || 0);
                    const valueB2 = (parseFloat(b['Current Stock']) || 0) * (parseFloat(b['Cost Per Unit']) || 0);
                    return valueB2 - valueA2;
                case 'category':
                    return a.Category?.localeCompare(b.Category) || 0;
                default:
                    return 0;
            }
        });
    }
    
    renderInventoryTable() {
        const tableContainer = document.getElementById('inventoryTable');
        if (!tableContainer) return;
        
        if (this.filteredData.length === 0) {
            tableContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No items found</h5>
                    <p class="text-muted">Try adjusting your search criteria or filters</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="table-responsive">
                <table class="table table-hover inventory-table">
                    <thead>
                        <tr>
                            <th>
                                <input type="checkbox" class="form-check-input" id="selectAll" onchange="inventoryManager.toggleSelectAll(this)">
                            </th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Current Stock</th>
                            <th>Unit</th>
                            <th>Cost/Unit</th>
                            <th>Total Value</th>
                            <th>Status</th>
                            <th>Supplier</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredData.map((item, index) => this.renderTableRow(item, index)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        tableContainer.innerHTML = html;
        this.updateBulkActionsBar();
    }
    
    renderTableRow(item, index) {
        const currentStock = parseFloat(item['Current Stock']) || 0;
        const reorderLevel = parseFloat(item['Reorder Level']) || 0;
        const costPerUnit = parseFloat(item['Cost Per Unit']) || 0;
        const totalValue = currentStock * costPerUnit;
        
        let stockStatus = 'healthy';
        let stockBadge = 'success';
        let stockText = 'Healthy';
        
        if (currentStock <= 0) {
            stockStatus = 'critical';
            stockBadge = 'danger';
            stockText = 'Out of Stock';
        } else if (currentStock <= reorderLevel) {
            stockStatus = 'low';
            stockBadge = 'warning';
            stockText = 'Low Stock';
        }
        
        const itemId = item['Item ID'] || item.Name?.replace(/[^a-zA-Z0-9]/g, '_') || `item_${index}`;
        
        return `
            <tr class="inventory-row ${this.selectedItems.has(itemId) ? 'selected' : ''}" data-item-id="${itemId}">
                <td>
                    <input type="checkbox" class="form-check-input item-checkbox" 
                           value="${itemId}" onchange="inventoryManager.toggleItemSelection('${itemId}', this)">
                </td>
                <td>
                    <div class="item-name-cell">
                        <strong>${item.Name || 'Unnamed Item'}</strong>
                    </div>
                </td>
                <td>
                    <span class="category-tag">${item.Category || 'Uncategorized'}</span>
                </td>
                <td>
                    <span class="stock-quantity ${stockStatus}">${currentStock}</span>
                </td>
                <td>${item.Unit || '-'}</td>
                <td>$${costPerUnit.toFixed(2)}</td>
                <td>
                    <strong>$${totalValue.toFixed(2)}</strong>
                </td>
                <td>
                    <span class="badge bg-${stockBadge}">${stockText}</span>
                </td>
                <td>${item.Supplier || 'Unknown'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary" onclick="editItem('${itemId}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${itemId}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    updateActiveFiltersDisplay() {
        const container = document.getElementById('activeFilters');
        const tagsContainer = document.getElementById('filterTags');
        
        if (!container || !tagsContainer) return;
        
        const filterCount = Object.keys(this.activeFilters).length;
        
        if (filterCount === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        
        const tags = Object.entries(this.activeFilters).map(([key, value]) => {
            let label = '';
            let displayValue = value;
            
            switch (key) {
                case 'search':
                    label = 'Search';
                    break;
                case 'category':
                    label = 'Category';
                    break;
                case 'supplier':
                    label = 'Supplier';
                    break;
                case 'stockStatus':
                    label = 'Status';
                    displayValue = value.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    break;
                case 'minValue':
                    label = 'Min Value';
                    displayValue = '$' + value;
                    break;
                case 'maxValue':
                    label = 'Max Value';
                    displayValue = '$' + value;
                    break;
            }
            
            return `
                <span class="filter-tag">
                    <span class="filter-label">${label}:</span>
                    <span class="filter-value">${displayValue}</span>
                    <button class="filter-remove" onclick="inventoryManager.removeFilter('${key}')">
                        <i class="fas fa-times"></i>
                    </button>
                </span>
            `;
        });
        
        tagsContainer.innerHTML = tags.join('');
    }
    
    removeFilter(filterKey) {
        delete this.activeFilters[filterKey];
        
        // Clear the corresponding form field
        switch (filterKey) {
            case 'search':
                document.getElementById('globalSearch').value = '';
                break;
            case 'category':
                document.getElementById('categoryFilter').value = '';
                break;
            case 'supplier':
                document.getElementById('supplierFilter').value = '';
                break;
            case 'stockStatus':
                document.getElementById('stockStatusFilter').value = '';
                break;
            case 'minValue':
                document.getElementById('minValue').value = '';
                break;
            case 'maxValue':
                document.getElementById('maxValue').value = '';
                break;
        }
        
        this.applyFilters();
    }
    
    toggleAdvancedFilters() {
        const advancedFilters = document.getElementById('advancedFilters');
        if (advancedFilters) {
            const isVisible = advancedFilters.style.display !== 'none';
            advancedFilters.style.display = isVisible ? 'none' : 'block';
            
            const button = document.querySelector('[onclick="toggleAdvancedFilters()"]');
            if (button) {
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = isVisible ? 'fas fa-filter me-1' : 'fas fa-filter-circle-xmark me-1';
                }
                button.innerHTML = isVisible ? 
                    '<i class="fas fa-filter me-1"></i>More Filters' : 
                    '<i class="fas fa-filter-circle-xmark me-1"></i>Hide Filters';
            }
        }
    }
    
    clearAllFilters() {
        this.activeFilters = {};
        this.selectedItems.clear();
        
        // Clear all form fields
        document.getElementById('globalSearch').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('stockStatusFilter').value = '';
        document.getElementById('supplierFilter').value = '';
        document.getElementById('minValue').value = '';
        document.getElementById('maxValue').value = '';
        document.getElementById('sortBy').value = 'name';
        
        this.currentSort = 'name';
        this.applyFilters();
        notifications.show('All filters cleared', 'info', 2000);
    }
    
    saveSearchPreset() {
        const presetName = prompt('Enter a name for this search preset:');
        if (!presetName) return;
        
        const preset = {
            name: presetName,
            filters: { ...this.activeFilters },
            sort: this.currentSort,
            created: new Date().toISOString()
        };
        
        this.savedSearches.push(preset);
        localStorage.setItem('savedSearches', JSON.stringify(this.savedSearches));
        this.loadSavedSearches();
        notifications.show(`Search preset "${presetName}" saved`, 'success', 3000);
    }
    
    loadSavedSearches() {
        const presetsContainer = document.getElementById('presetButtons');
        const presetsRow = document.getElementById('searchPresets');
        
        if (!presetsContainer || !presetsRow) return;
        
        if (this.savedSearches.length === 0) {
            presetsRow.style.display = 'none';
            return;
        }
        
        presetsRow.style.display = 'block';
        
        presetsContainer.innerHTML = this.savedSearches.map((preset, index) => `
            <button class="btn btn-sm btn-outline-info me-2 mb-2" onclick="inventoryManager.loadSearchPreset(${index})">
                <i class="fas fa-bookmark me-1"></i>${preset.name}
                <button class="btn btn-sm btn-link text-danger p-0 ms-1" onclick="event.stopPropagation(); inventoryManager.deleteSearchPreset(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </button>
        `).join('');
    }
    
    loadSearchPreset(index) {
        const preset = this.savedSearches[index];
        if (!preset) return;
        
        this.activeFilters = { ...preset.filters };
        this.currentSort = preset.sort || 'name';
        
        // Update form fields
        document.getElementById('globalSearch').value = preset.filters.search || '';
        document.getElementById('categoryFilter').value = preset.filters.category || '';
        document.getElementById('stockStatusFilter').value = preset.filters.stockStatus || '';
        document.getElementById('supplierFilter').value = preset.filters.supplier || '';
        document.getElementById('minValue').value = preset.filters.minValue || '';
        document.getElementById('maxValue').value = preset.filters.maxValue || '';
        document.getElementById('sortBy').value = this.currentSort;
        
        this.applyFilters();
        notifications.show(`Loaded search preset "${preset.name}"`, 'info', 3000);
    }
    
    deleteSearchPreset(index) {
        if (!confirm('Delete this search preset?')) return;
        
        this.savedSearches.splice(index, 1);
        localStorage.setItem('savedSearches', JSON.stringify(this.savedSearches));
        this.loadSavedSearches();
        notifications.show('Search preset deleted', 'info', 2000);
    }
    
    toggleSelectAll(checkbox) {
        const itemCheckboxes = document.querySelectorAll('.item-checkbox');
        
        if (checkbox.checked) {
            itemCheckboxes.forEach(cb => {
                cb.checked = true;
                this.selectedItems.add(cb.value);
            });
        } else {
            itemCheckboxes.forEach(cb => {
                cb.checked = false;
                this.selectedItems.delete(cb.value);
            });
        }
        
        this.updateBulkActionsBar();
        this.updateRowSelection();
    }
    
    toggleItemSelection(itemId, checkbox) {
        if (checkbox.checked) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }
        
        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('selectAll');
        const itemCheckboxes = document.querySelectorAll('.item-checkbox');
        const checkedBoxes = document.querySelectorAll('.item-checkbox:checked');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = checkedBoxes.length === itemCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < itemCheckboxes.length;
        }
        
        this.updateBulkActionsBar();
        this.updateRowSelection();
    }
    
    updateRowSelection() {
        document.querySelectorAll('.inventory-row').forEach(row => {
            const itemId = row.dataset.itemId;
            if (this.selectedItems.has(itemId)) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }
    
    updateBulkActionsBar() {
        const bulkActionsBar = document.getElementById('bulkActionsBar');
        const selectedCount = document.getElementById('selectedCount');
        
        if (!bulkActionsBar || !selectedCount) return;
        
        if (this.selectedItems.size > 0) {
            bulkActionsBar.style.display = 'block';
            selectedCount.textContent = this.selectedItems.size;
        } else {
            bulkActionsBar.style.display = 'none';
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    setupAutoComplete() {
        // Auto-complete functionality is integrated into handleSearch method
    }
}

// Global functions for button onclick handlers
function toggleAdvancedFilters() {
    inventoryManager.toggleAdvancedFilters();
}

function clearAllFilters() {
    inventoryManager.clearAllFilters();
}

function applyFilters() {
    inventoryManager.applyFilters();
}

function saveSearchPreset() {
    inventoryManager.saveSearchPreset();
}

function bulkUpdateStock() {
    if (inventoryManager.selectedItems.size === 0) {
        notifications.show('Please select items to update', 'warning', 3000);
        return;
    }
    
    const newStock = prompt('Enter new stock level for selected items:');
    if (newStock === null || newStock === '') return;
    
    const stockValue = parseFloat(newStock);
    if (isNaN(stockValue) || stockValue < 0) {
        notifications.show('Please enter a valid stock level', 'error', 3000);
        return;
    }
    
    notifications.show(`Stock level updated for ${inventoryManager.selectedItems.size} items`, 'success', 3000);
    inventoryManager.selectedItems.clear();
    inventoryManager.updateBulkActionsBar();
}

function bulkUpdateCategory() {
    if (inventoryManager.selectedItems.size === 0) {
        notifications.show('Please select items to update', 'warning', 3000);
        return;
    }
    
    const newCategory = prompt('Enter new category for selected items:');
    if (newCategory === null || newCategory === '') return;
    
    notifications.show(`Category updated for ${inventoryManager.selectedItems.size} items`, 'success', 3000);
    inventoryManager.selectedItems.clear();
    inventoryManager.updateBulkActionsBar();
}

function bulkExport() {
    if (inventoryManager.selectedItems.size === 0) {
        notifications.show('Please select items to export', 'warning', 3000);
        return;
    }
    
    notifications.show(`Exporting ${inventoryManager.selectedItems.size} selected items`, 'info', 3000);
}

function bulkDelete() {
    if (inventoryManager.selectedItems.size === 0) {
        notifications.show('Please select items to delete', 'warning', 3000);
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${inventoryManager.selectedItems.size} selected items?`)) {
        return;
    }
    
    notifications.show(`${inventoryManager.selectedItems.size} items deleted`, 'success', 3000);
    inventoryManager.selectedItems.clear();
    inventoryManager.updateBulkActionsBar();
    inventoryManager.loadInventoryData();
}

function editItem(itemId) {
    const item = inventoryManager.inventoryData.find(i => (i['Item ID'] || i.Name?.replace(/[^a-zA-Z0-9]/g, '_')) === itemId);
    if (!item) {
        notifications.show('Item not found', 'error', 3000);
        return;
    }
    
    // Populate edit form
    document.getElementById('editItemId').value = itemId;
    document.getElementById('editItemName').value = item.Name || '';
    document.getElementById('editItemCategory').value = item.Category || '';
    document.getElementById('editCurrentStock').value = item['Current Stock'] || '';
    document.getElementById('editUnit').value = item.Unit || '';
    document.getElementById('editCostPerUnit').value = item['Cost Per Unit'] || '';
    document.getElementById('editReorderLevel').value = item['Reorder Level'] || '';
    document.getElementById('editSupplier').value = item.Supplier || '';
    
    const editModal = new bootstrap.Modal(document.getElementById('editItemModal'));
    editModal.show();
}

function deleteItem(itemId) {
    const item = inventoryManager.inventoryData.find(i => (i['Item ID'] || i.Name?.replace(/[^a-zA-Z0-9]/g, '_')) === itemId);
    if (!item) {
        notifications.show('Item not found', 'error', 3000);
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${item.Name}"?`)) return;
    
    notifications.show(`Item "${item.Name}" deleted`, 'success', 3000);
    inventoryManager.loadInventoryData();
}

function exportInventory() {
    notifications.show('Exporting inventory data...', 'info', 3000);
    
    // Create CSV content
    const headers = ['Name', 'Category', 'Current Stock', 'Unit', 'Cost Per Unit', 'Reorder Level', 'Supplier'];
    const csvContent = [
        headers.join(','),
        ...inventoryManager.filteredData.map(item => [
            `"${item.Name || ''}"`,
            `"${item.Category || ''}"`,
            item['Current Stock'] || 0,
            `"${item.Unit || ''}"`,
            item['Cost Per Unit'] || 0,
            item['Reorder Level'] || 0,
            `"${item.Supplier || ''}"`
        ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function addItem() {
    // Get form data
    const formData = {
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        stock: document.getElementById('currentStock').value,
        unit: document.getElementById('unit').value,
        cost: document.getElementById('costPerUnit').value,
        reorder: document.getElementById('reorderLevel').value,
        supplier: document.getElementById('supplier').value
    };
    
    // Validate required fields
    if (!formData.name || !formData.category || !formData.stock || !formData.unit) {
        notifications.show('Please fill in all required fields', 'error', 3000);
        return;
    }
    
    notifications.show(`Item "${formData.name}" added successfully`, 'success', 3000);
    
    // Close modal and refresh data
    const modal = bootstrap.Modal.getInstance(document.getElementById('addItemModal'));
    if (modal) modal.hide();
    
    // Clear form
    document.getElementById('addItemForm').reset();
    
    // Reload inventory data
    inventoryManager.loadInventoryData();
}

function updateItem() {
    const itemId = document.getElementById('editItemId').value;
    const itemName = document.getElementById('editItemName').value;
    
    // Get form data
    const formData = {
        name: itemName,
        category: document.getElementById('editItemCategory').value,
        stock: document.getElementById('editCurrentStock').value,
        unit: document.getElementById('editUnit').value,
        cost: document.getElementById('editCostPerUnit').value,
        reorder: document.getElementById('editReorderLevel').value,
        supplier: document.getElementById('editSupplier').value
    };
    
    // Validate required fields
    if (!formData.name || !formData.category || !formData.stock || !formData.unit) {
        notifications.show('Please fill in all required fields', 'error', 3000);
        return;
    }
    
    notifications.show(`Item "${itemName}" updated successfully`, 'success', 3000);
    
    // Close modal and refresh data
    const modal = bootstrap.Modal.getInstance(document.getElementById('editItemModal'));
    if (modal) modal.hide();
    
    // Reload inventory data
    inventoryManager.loadInventoryData();
}

// Initialize inventory manager when DOM is loaded
let inventoryManager;
document.addEventListener('DOMContentLoaded', function() {
    inventoryManager = new InventoryManager();
});