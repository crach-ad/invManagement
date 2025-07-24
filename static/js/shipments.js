// Shipment Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    loadShipments();
    setDefaultDate();
});

function setDefaultDate() {
    const now = new Date();
    const dateString = now.toISOString().slice(0, 16); // Format for datetime-local
    document.getElementById('shipmentDate').value = dateString;
}

async function loadShipments() {
    showLoading('shipmentsTable');
    
    try {
        currentShipments = await loadData('/api/shipments');
        displayShipments(currentShipments);
    } catch (error) {
        document.getElementById('shipmentsTable').innerHTML = 
            '<div class="alert alert-danger">Failed to load shipment data</div>';
    }
}

function displayShipments(shipments) {
    const container = document.getElementById('shipmentsTable');
    
    if (shipments.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4">No shipments found</div>';
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-striped table-hover" id="shipmentsDataTable">
                <thead>
                    <tr>
                        <th>Shipment ID</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Status</th>
                        <th>Total Items</th>
                        <th>Total Cost</th>
                        <th>Received By</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    shipments.forEach(shipment => {
        const statusClass = getStatusClass(shipment.Status);
        
        html += `
            <tr>
                <td><small>${shipment['Shipment ID']}</small></td>
                <td>${formatDate(shipment.Date)}</td>
                <td><strong>${shipment.Supplier}</strong></td>
                <td><span class="badge ${statusClass}">${shipment.Status}</span></td>
                <td>${shipment['Total Items'] || 0}</td>
                <td>${formatCurrency(shipment['Total Cost'] || 0)}</td>
                <td>${shipment['Received By'] || '-'}</td>
                <td class="btn-actions">
                    ${shipment.Status === 'Pending' ? 
                        `<button class="btn btn-sm btn-success" onclick="openReceiveModal('${shipment['Shipment ID']}')" title="Receive">
                            <i class="fas fa-check"></i>
                        </button>` : ''
                    }
                    <button class="btn btn-sm btn-outline-primary" onclick="viewShipmentDetails('${shipment['Shipment ID']}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function getStatusClass(status) {
    const statusClasses = {
        'Pending': 'status-pending',
        'Received': 'status-received',
        'Partial': 'status-completed'
    };
    return statusClasses[status] || 'bg-light text-dark';
}

async function addShipment() {
    const requiredFields = ['shipmentSupplier'];
    
    if (!validateForm('addShipmentForm', requiredFields)) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    const shipmentData = {
        supplier: document.getElementById('shipmentSupplier').value,
        date: document.getElementById('shipmentDate').value,
        total_items: parseInt(document.getElementById('totalItems').value) || 0,
        total_cost: parseFloat(document.getElementById('totalCost').value) || 0,
        notes: document.getElementById('shipmentNotes').value
    };
    
    try {
        await createData('/api/shipments', shipmentData);
        hideModal('addShipmentModal');
        resetForm('addShipmentForm');
        setDefaultDate();
        loadShipments();
    } catch (error) {
        // Error already handled in createData
    }
}

function openReceiveModal(shipmentId) {
    document.getElementById('receiveShipmentId').value = shipmentId;
    
    // Clear previous items
    const itemsContainer = document.getElementById('itemsReceived');
    itemsContainer.innerHTML = `
        <div class="row mb-2">
            <div class="col-md-6">
                <input type="text" class="form-control" placeholder="Item ID" name="item_id[]">
            </div>
            <div class="col-md-4">
                <input type="number" class="form-control" placeholder="Quantity" name="quantity[]" step="0.01">
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-outline-success" onclick="addItemRow()">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        </div>
    `;
    
    showModal('receiveShipmentModal');
}

function addItemRow() {
    const itemsContainer = document.getElementById('itemsReceived');
    const newRow = document.createElement('div');
    newRow.className = 'row mb-2';
    newRow.innerHTML = `
        <div class="col-md-6">
            <input type="text" class="form-control" placeholder="Item ID" name="item_id[]">
        </div>
        <div class="col-md-4">
            <input type="number" class="form-control" placeholder="Quantity" name="quantity[]" step="0.01">
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-outline-danger" onclick="removeItemRow(this)">
                <i class="fas fa-minus"></i>
            </button>
        </div>
    `;
    itemsContainer.appendChild(newRow);
}

function removeItemRow(button) {
    button.closest('.row').remove();
}

async function receiveShipment() {
    const shipmentId = document.getElementById('receiveShipmentId').value;
    const receivedBy = document.getElementById('receivedBy').value;
    
    if (!receivedBy.trim()) {
        showAlert('Please enter who received the shipment', 'warning');
        return;
    }
    
    // Collect items received
    const itemIds = document.querySelectorAll('input[name="item_id[]"]');
    const quantities = document.querySelectorAll('input[name="quantity[]"]');
    const itemsReceived = [];
    
    for (let i = 0; i < itemIds.length; i++) {
        const itemId = itemIds[i].value.trim();
        const quantity = parseFloat(quantities[i].value);
        
        if (itemId && quantity > 0) {
            itemsReceived.push({
                item_id: itemId,
                quantity: quantity
            });
        }
    }
    
    if (itemsReceived.length === 0) {
        showAlert('Please add at least one item with quantity', 'warning');
        return;
    }
    
    try {
        const response = await apiRequest(`/api/shipments/${shipmentId}/receive`, {
            method: 'POST',
            body: JSON.stringify({
                received_by: receivedBy,
                items_received: itemsReceived
            })
        });
        
        if (response.success) {
            showAlert('Shipment received successfully!', 'success');
            hideModal('receiveShipmentModal');
            resetForm('receiveShipmentForm');
            loadShipments();
        } else {
            throw new Error(response.error || 'Failed to receive shipment');
        }
    } catch (error) {
        showAlert(`Error receiving shipment: ${error.message}`, 'danger');
    }
}

function viewShipmentDetails(shipmentId) {
    const shipment = currentShipments.find(s => s['Shipment ID'] === shipmentId);
    if (!shipment) {
        showAlert('Shipment not found', 'danger');
        return;
    }
    
    const details = `
        <strong>Shipment ID:</strong> ${shipment['Shipment ID']}<br>
        <strong>Date:</strong> ${formatDate(shipment.Date)}<br>
        <strong>Supplier:</strong> ${shipment.Supplier}<br>
        <strong>Status:</strong> ${shipment.Status}<br>
        <strong>Total Items:</strong> ${shipment['Total Items'] || 0}<br>
        <strong>Total Cost:</strong> ${formatCurrency(shipment['Total Cost'] || 0)}<br>
        <strong>Received By:</strong> ${shipment['Received By'] || 'Not yet received'}<br>
        <strong>Notes:</strong> ${shipment.Notes || 'No notes'}
    `;
    
    showAlert(details, 'info', 0); // Don't auto-dismiss
}

function filterByStatus() {
    const status = document.getElementById('statusFilter').value;
    filterTable('shipmentsDataTable', 3, status); // Status is column index 3
}

// Search by supplier
document.getElementById('supplierSearch')?.addEventListener('keyup', function(event) {
    const searchTerm = this.value;
    searchTable('shipmentsDataTable', searchTerm);
});

// Export shipments to CSV
function exportShipments() {
    if (currentShipments.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }
    
    const filename = `shipments_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(currentShipments, filename);
}