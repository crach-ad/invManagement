// Reports JavaScript

let currentReportData = null;
let currentReportType = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize reports page
});

async function generateInventoryReport() {
    showReportLoading('Inventory Report');
    
    try {
        const inventory = await loadData('/api/inventory');
        currentReportData = inventory;
        currentReportType = 'inventory';
        
        displayInventoryReport(inventory);
        showReportActions();
    } catch (error) {
        showReportError('Failed to generate inventory report');
    }
}

async function generateLowStockReport() {
    showReportLoading('Low Stock Report');
    
    try {
        const lowStockItems = await loadData('/api/stock-check');
        currentReportData = lowStockItems;
        currentReportType = 'low-stock';
        
        displayLowStockReport(lowStockItems);
        showReportActions();
    } catch (error) {
        showReportError('Failed to generate low stock report');
    }
}

async function generateShipmentReport() {
    showReportLoading('Shipment Report');
    
    try {
        const shipments = await loadData('/api/shipments');
        currentReportData = shipments;
        currentReportType = 'shipments';
        
        displayShipmentReport(shipments);
        showReportActions();
    } catch (error) {
        showReportError('Failed to generate shipment report');
    }
}

async function generateMovementReport() {
    showReportLoading('Stock Movement Report');
    
    try {
        // Note: In a real implementation, you'd have an endpoint for stock movements
        // For now, we'll show a placeholder
        showAlert('Stock movement report feature coming soon!', 'info');
        hideReportActions();
    } catch (error) {
        showReportError('Failed to generate movement report');
    }
}

function showReportLoading(title) {
    document.getElementById('reportTitle').textContent = title;
    document.getElementById('reportContent').innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p>Generating report...</p>
        </div>
    `;
}

function showReportError(message) {
    document.getElementById('reportContent').innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
        </div>
    `;
    hideReportActions();
}

function showReportActions() {
    document.getElementById('reportActions').style.display = 'block';
}

function hideReportActions() {
    document.getElementById('reportActions').style.display = 'none';
}

function displayInventoryReport(inventory) {
    if (inventory.length === 0) {
        document.getElementById('reportContent').innerHTML = 
            '<div class="alert alert-info">No inventory items found</div>';
        return;
    }
    
    // Calculate summary statistics
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => 
        sum + (parseFloat(item['Current Stock']) * parseFloat(item['Cost Per Unit'])), 0);
    const lowStockCount = inventory.filter(item => 
        parseFloat(item['Current Stock']) <= parseFloat(item['Reorder Level'])).length;
    
    // Get categories
    const categories = [...new Set(inventory.map(item => item.Category).filter(cat => cat))];
    
    let html = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                        <h3>${totalItems}</h3>
                        <p class="mb-0">Total Items</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white">
                    <div class="card-body text-center">
                        <h3>${formatCurrency(totalValue)}</h3>
                        <p class="mb-0">Total Value</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-white">
                    <div class="card-body text-center">
                        <h3>${lowStockCount}</h3>
                        <p class="mb-0">Low Stock Items</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body text-center">
                        <h3>${categories.length}</h3>
                        <p class="mb-0">Categories</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Current Stock</th>
                        <th>Unit</th>
                        <th>Cost/Unit</th>
                        <th>Total Value</th>
                        <th>Reorder Level</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    inventory.forEach(item => {
        const currentStock = parseFloat(item['Current Stock']);
        const costPerUnit = parseFloat(item['Cost Per Unit']);
        const reorderLevel = parseFloat(item['Reorder Level']);
        const totalItemValue = currentStock * costPerUnit;
        const isLowStock = currentStock <= reorderLevel;
        
        html += `
            <tr class="${isLowStock ? 'low-stock' : ''}">
                <td><strong>${item.Name}</strong></td>
                <td>${item.Category}</td>
                <td>${formatNumber(currentStock)}</td>
                <td>${item.Unit}</td>
                <td>${formatCurrency(costPerUnit)}</td>
                <td>${formatCurrency(totalItemValue)}</td>
                <td>${formatNumber(reorderLevel)}</td>
                <td>
                    ${isLowStock ? 
                        '<span class="badge bg-warning">Low Stock</span>' : 
                        '<span class="badge bg-success">OK</span>'
                    }
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    document.getElementById('reportContent').innerHTML = html;
}

function displayLowStockReport(lowStockItems) {
    if (lowStockItems.length === 0) {
        document.getElementById('reportContent').innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle me-2"></i>
                Great! No items are currently below their reorder level.
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>${lowStockItems.length}</strong> items are below their reorder level and need attention.
        </div>
        
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Current Stock</th>
                        <th>Reorder Level</th>
                        <th>Shortage</th>
                        <th>Unit</th>
                        <th>Supplier</th>
                        <th>Urgency</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    lowStockItems.forEach(item => {
        const currentStock = parseFloat(item['Current Stock']);
        const reorderLevel = parseFloat(item['Reorder Level']);
        const shortage = reorderLevel - currentStock;
        const urgency = currentStock === 0 ? 'Critical' : 
                       shortage >= reorderLevel * 0.5 ? 'High' : 'Medium';
        const urgencyClass = currentStock === 0 ? 'bg-danger' : 
                           shortage >= reorderLevel * 0.5 ? 'bg-warning' : 'bg-info';
        
        html += `
            <tr>
                <td><strong>${item.Name}</strong></td>
                <td>${item.Category}</td>
                <td class="text-danger"><strong>${formatNumber(currentStock)}</strong></td>
                <td>${formatNumber(reorderLevel)}</td>
                <td class="text-danger">${formatNumber(shortage)}</td>
                <td>${item.Unit}</td>
                <td>${item.Supplier}</td>
                <td><span class="badge ${urgencyClass}">${urgency}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    document.getElementById('reportContent').innerHTML = html;
}

function displayShipmentReport(shipments) {
    if (shipments.length === 0) {
        document.getElementById('reportContent').innerHTML = 
            '<div class="alert alert-info">No shipments found</div>';
        return;
    }
    
    // Calculate summary statistics
    const totalShipments = shipments.length;
    const pendingShipments = shipments.filter(s => s.Status === 'Pending').length;
    const receivedShipments = shipments.filter(s => s.Status === 'Received').length;
    const totalValue = shipments.reduce((sum, shipment) => 
        sum + parseFloat(shipment['Total Cost'] || 0), 0);
    
    let html = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                        <h3>${totalShipments}</h3>
                        <p class="mb-0">Total Shipments</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-white">
                    <div class="card-body text-center">
                        <h3>${pendingShipments}</h3>
                        <p class="mb-0">Pending</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white">
                    <div class="card-body text-center">
                        <h3>${receivedShipments}</h3>
                        <p class="mb-0">Received</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body text-center">
                        <h3>${formatCurrency(totalValue)}</h3>
                        <p class="mb-0">Total Value</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Shipment ID</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Status</th>
                        <th>Total Items</th>
                        <th>Total Cost</th>
                        <th>Received By</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    shipments.forEach(shipment => {
        const statusClass = getShipmentStatusClass(shipment.Status);
        
        html += `
            <tr>
                <td><small>${shipment['Shipment ID']}</small></td>
                <td>${formatDate(shipment.Date)}</td>
                <td><strong>${shipment.Supplier}</strong></td>
                <td><span class="badge ${statusClass}">${shipment.Status}</span></td>
                <td>${shipment['Total Items'] || 0}</td>
                <td>${formatCurrency(shipment['Total Cost'] || 0)}</td>
                <td>${shipment['Received By'] || '-'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    document.getElementById('reportContent').innerHTML = html;
}

function getShipmentStatusClass(status) {
    const statusClasses = {
        'Pending': 'bg-warning text-dark',
        'Received': 'bg-success',
        'Partial': 'bg-info'
    };
    return statusClasses[status] || 'bg-light text-dark';
}

function exportCurrentReport() {
    if (!currentReportData || currentReportData.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }
    
    const filename = `${currentReportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(currentReportData, filename);
}

function printReport() {
    if (!currentReportData) {
        showAlert('No report to print', 'warning');
        return;
    }
    
    const reportContent = document.getElementById('reportContent').innerHTML;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${document.getElementById('reportTitle').textContent}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                @media print {
                    .no-print { display: none !important; }
                    body { font-size: 12px; }
                    .card { box-shadow: none; border: 1px solid #ddd; }
                }
            </style>
        </head>
        <body>
            <div class="container-fluid">
                <h2 class="mb-4">${document.getElementById('reportTitle').textContent}</h2>
                <p class="text-muted">Generated on: ${new Date().toLocaleString()}</p>
                <hr>
                ${reportContent}
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}