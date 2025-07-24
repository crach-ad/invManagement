// Inventory Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    loadInventory();
    loadCategories();
});

async function loadInventory() {
    showLoading('inventoryTable');
    
    try {
        currentInventory = await loadData('/api/inventory');
        displayInventory(currentInventory);
    } catch (error) {
        document.getElementById('inventoryTable').innerHTML = 
            '<div class="alert alert-danger">Failed to load inventory data</div>';
    }
}

async function loadCategories() {
    try {
        const inventory = await loadData('/api/inventory');
        const categories = [...new Set(inventory.map(item => item.Category).filter(cat => cat))];
        
        const categoryFilter = document.getElementById('categoryFilter');
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        categories.forEach(category => {
            categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function displayInventory(items) {
    const container = document.getElementById('inventoryTable');
    
    if (items.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4">No inventory items found</div>';
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover" id="inventoryDataTable">
                <thead>
                    <tr>
                        <th>Item ID</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Unit</th>
                        <th>Cost/Unit</th>
                        <th>Reorder Level</th>
                        <th>Supplier</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    items.forEach(item => {
        const isLowStock = parseFloat(item['Current Stock']) <= parseFloat(item['Reorder Level']);
        const rowClass = isLowStock ? 'low-stock' : '';
        
        html += `
            <tr class="${rowClass}">
                <td><small>${item['Item ID']}</small></td>
                <td><strong>${item.Name}</strong></td>
                <td>${item.Category}</td>
                <td>
                    ${formatNumber(item['Current Stock'])}
                    ${isLowStock ? '<i class="fas fa-exclamation-triangle text-warning ms-1" title="Low Stock"></i>' : ''}
                </td>
                <td>${item.Unit}</td>
                <td>${formatCurrency(item['Cost Per Unit'])}</td>
                <td>${formatNumber(item['Reorder Level'])}</td>
                <td>${item.Supplier}</td>
                <td><small>${formatDate(item['Last Updated'])}</small></td>
                <td class="btn-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="editItem('${item['Item ID']}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${item['Item ID']}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function addItem() {
    const requiredFields = ['itemName', 'itemCategory', 'currentStock', 'unit'];
    
    if (!validateForm('addItemForm', requiredFields)) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    const itemData = {
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        current_stock: parseFloat(document.getElementById('currentStock').value),
        unit: document.getElementById('unit').value,
        cost_per_unit: parseFloat(document.getElementById('costPerUnit').value) || 0,
        reorder_level: parseFloat(document.getElementById('reorderLevel').value) || 0,
        supplier: document.getElementById('supplier').value
    };
    
    try {
        await createData('/api/inventory', itemData);
        hideModal('addItemModal');
        resetForm('addItemForm');
        loadInventory();
        loadCategories();
    } catch (error) {
        // Error already handled in createData
    }
}

function editItem(itemId) {
    const item = currentInventory.find(i => i['Item ID'] === itemId);
    if (!item) {
        showAlert('Item not found', 'danger');
        return;
    }
    
    // Populate edit form
    document.getElementById('editItemId').value = itemId;
    document.getElementById('editItemName').value = item.Name;
    document.getElementById('editItemCategory').value = item.Category;
    document.getElementById('editCurrentStock').value = item['Current Stock'];
    document.getElementById('editUnit').value = item.Unit;
    document.getElementById('editCostPerUnit').value = item['Cost Per Unit'];
    document.getElementById('editReorderLevel').value = item['Reorder Level'];
    document.getElementById('editSupplier').value = item.Supplier;
    
    showModal('editItemModal');
}

async function updateItem() {
    const itemId = document.getElementById('editItemId').value;
    const requiredFields = ['editItemName', 'editItemCategory', 'editCurrentStock', 'editUnit'];
    
    if (!validateForm('editItemForm', requiredFields)) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    const itemData = {
        name: document.getElementById('editItemName').value,
        category: document.getElementById('editItemCategory').value,
        current_stock: parseFloat(document.getElementById('editCurrentStock').value),
        unit: document.getElementById('editUnit').value,
        cost_per_unit: parseFloat(document.getElementById('editCostPerUnit').value) || 0,
        reorder_level: parseFloat(document.getElementById('editReorderLevel').value) || 0,
        supplier: document.getElementById('editSupplier').value
    };
    
    try {
        await updateData(`/api/inventory/${itemId}`, itemData);
        hideModal('editItemModal');
        resetForm('editItemForm');
        loadInventory();
        loadCategories();
    } catch (error) {
        // Error already handled in updateData
    }
}

function deleteItem(itemId) {
    const item = currentInventory.find(i => i['Item ID'] === itemId);
    if (!item) {
        showAlert('Item not found', 'danger');
        return;
    }
    
    confirmAction(
        `Are you sure you want to delete "${item.Name}"? This action cannot be undone.`,
        async () => {
            try {
                await deleteData(`/api/inventory/${itemId}`);
                loadInventory();
                loadCategories();
            } catch (error) {
                // Error already handled in deleteData
            }
        }
    );
}

function searchItems() {
    const searchTerm = document.getElementById('searchInput').value;
    searchTable('inventoryDataTable', searchTerm);
}

function filterByCategory() {
    const category = document.getElementById('categoryFilter').value;
    filterTable('inventoryDataTable', 2, category); // Category is column index 2
}

// Export inventory to CSV
function exportInventory() {
    if (currentInventory.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }
    
    const filename = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(currentInventory, filename);
}

// Event listeners
document.getElementById('searchInput')?.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        searchItems();
    }
});

// Add export button to inventory page if it doesn't exist
document.addEventListener('DOMContentLoaded', function() {
    const inventoryPage = document.querySelector('.col-12 h1');
    if (inventoryPage && inventoryPage.textContent.includes('Inventory Management')) {
        const buttonContainer = inventoryPage.parentElement;
        if (!buttonContainer.querySelector('.btn-export')) {
            const exportButton = document.createElement('button');
            exportButton.className = 'btn btn-success btn-export ms-2';
            exportButton.innerHTML = '<i class="fas fa-download me-2"></i>Export CSV';
            exportButton.onclick = exportInventory;
            buttonContainer.appendChild(exportButton);
        }
    }
});