// Transfer Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    loadTransfers();
    setDefaultTransferDate();
});

function setDefaultTransferDate() {
    const now = new Date();
    const dateString = now.toISOString().slice(0, 16); // Format for datetime-local
    document.getElementById('transferDate').value = dateString;
}

async function loadTransfers() {
    showLoading('transfersTable');
    
    try {
        currentTransfers = await loadData('/api/transfers');
        displayTransfers(currentTransfers);
    } catch (error) {
        document.getElementById('transfersTable').innerHTML = 
            '<div class="alert alert-danger">Failed to load transfer data</div>';
    }
}

function displayTransfers(transfers) {
    const container = document.getElementById('transfersTable');
    
    if (transfers.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4">No transfers found</div>';
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover" id="transfersDataTable">
                <thead>
                    <tr>
                        <th>Transfer ID</th>
                        <th>Date</th>
                        <th>From Location</th>
                        <th>To Location</th>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    transfers.forEach(transfer => {
        const statusClass = getTransferStatusClass(transfer.Status);
        
        html += `
            <tr>
                <td><small>${transfer['Transfer ID']}</small></td>
                <td>${formatDate(transfer.Date)}</td>
                <td><strong>${transfer['From Location']}</strong></td>
                <td><strong>${transfer['To Location']}</strong></td>
                <td>
                    ${transfer['Item Name']}<br>
                    <small class="text-muted">${transfer['Item ID']}</small>
                </td>
                <td>${formatNumber(transfer.Quantity)}</td>
                <td><span class="badge ${statusClass}">${transfer.Status}</span></td>
                <td class="btn-actions">
                    ${transfer.Status === 'Pending' ? 
                        `<button class="btn btn-sm btn-success" onclick="completeTransfer('${transfer['Transfer ID']}')" title="Complete">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="cancelTransfer('${transfer['Transfer ID']}')" title="Cancel">
                            <i class="fas fa-times"></i>
                        </button>` : ''
                    }
                    <button class="btn btn-sm btn-outline-primary" onclick="viewTransferDetails('${transfer['Transfer ID']}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function getTransferStatusClass(status) {
    const statusClasses = {
        'Pending': 'status-pending',
        'Completed': 'status-completed',
        'Cancelled': 'bg-danger text-white'
    };
    return statusClasses[status] || 'bg-light text-dark';
}

async function addTransfer() {
    const requiredFields = ['fromLocation', 'toLocation', 'transferItemId', 'transferItemName', 'transferQuantity'];
    
    if (!validateForm('addTransferForm', requiredFields)) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    const transferData = {
        from_location: document.getElementById('fromLocation').value,
        to_location: document.getElementById('toLocation').value,
        item_id: document.getElementById('transferItemId').value,
        item_name: document.getElementById('transferItemName').value,
        quantity: parseFloat(document.getElementById('transferQuantity').value),
        date: document.getElementById('transferDate').value,
        notes: document.getElementById('transferNotes').value
    };
    
    try {
        await createData('/api/transfers', transferData);
        hideModal('addTransferModal');
        resetForm('addTransferForm');
        setDefaultTransferDate();
        loadTransfers();
    } catch (error) {
        // Error already handled in createData
    }
}

async function completeTransfer(transferId) {
    confirmAction(
        'Are you sure you want to complete this transfer?',
        async () => {
            try {
                const response = await apiRequest(`/api/transfers/${transferId}/complete`, {
                    method: 'POST'
                });
                
                if (response.success) {
                    showAlert('Transfer completed successfully!', 'success');
                    loadTransfers();
                } else {
                    throw new Error(response.error || 'Failed to complete transfer');
                }
            } catch (error) {
                showAlert(`Error completing transfer: ${error.message}`, 'danger');
            }
        }
    );
}

async function cancelTransfer(transferId) {
    confirmAction(
        'Are you sure you want to cancel this transfer?',
        async () => {
            try {
                const response = await apiRequest(`/api/transfers/${transferId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'Cancelled' })
                });
                
                if (response.success) {
                    showAlert('Transfer cancelled', 'info');
                    loadTransfers();
                } else {
                    throw new Error(response.error || 'Failed to cancel transfer');
                }
            } catch (error) {
                showAlert(`Error cancelling transfer: ${error.message}`, 'danger');
            }
        }
    );
}

function viewTransferDetails(transferId) {
    const transfer = currentTransfers.find(t => t['Transfer ID'] === transferId);
    if (!transfer) {
        showAlert('Transfer not found', 'danger');
        return;
    }
    
    const details = `
        <strong>Transfer ID:</strong> ${transfer['Transfer ID']}<br>
        <strong>Date:</strong> ${formatDate(transfer.Date)}<br>
        <strong>From:</strong> ${transfer['From Location']}<br>
        <strong>To:</strong> ${transfer['To Location']}<br>
        <strong>Item:</strong> ${transfer['Item Name']} (${transfer['Item ID']})<br>
        <strong>Quantity:</strong> ${formatNumber(transfer.Quantity)}<br>
        <strong>Status:</strong> ${transfer.Status}<br>
        <strong>Notes:</strong> ${transfer.Notes || 'No notes'}
    `;
    
    showAlert(details, 'info', 0); // Don't auto-dismiss
}

function filterByStatus() {
    const status = document.getElementById('statusFilter').value;
    filterTable('transfersDataTable', 6, status); // Status is column index 6
}

// Search by location
document.getElementById('locationSearch')?.addEventListener('keyup', function(event) {
    const searchTerm = this.value;
    searchTable('transfersDataTable', searchTerm);
});

// Export transfers to CSV
function exportTransfers() {
    if (currentTransfers.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }
    
    const filename = `transfers_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(currentTransfers, filename);
}

// Add item lookup functionality
document.getElementById('transferItemId')?.addEventListener('blur', async function() {
    const itemId = this.value.trim();
    if (!itemId) return;
    
    try {
        const inventory = await loadData('/api/inventory');
        const item = inventory.find(i => i['Item ID'] === itemId);
        
        if (item) {
            document.getElementById('transferItemName').value = item.Name;
            showAlert(`Item found: ${item.Name}`, 'success', 2000);
        } else {
            showAlert('Item ID not found in inventory', 'warning');
            document.getElementById('transferItemName').value = '';
        }
    } catch (error) {
        console.error('Error looking up item:', error);
    }
});