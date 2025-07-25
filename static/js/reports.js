// Professional PDF and Excel Reporting System
class ReportManager {
    constructor() {
        this.reportData = {};
        this.currentReportData = null;
        this.currentReportType = null;
        this.reportTemplates = {
            inventory: {
                name: 'Inventory Report',
                description: 'Complete inventory listing with stock levels and values',
                fields: ['Name', 'Category', 'Current Stock', 'Unit', 'Cost Per Unit', 'Total Value', 'Supplier', 'Status']
            },
            lowStock: {
                name: 'Low Stock Report',
                description: 'Items that need reordering',
                fields: ['Name', 'Category', 'Current Stock', 'Reorder Level', 'Unit', 'Supplier', 'Days Until Critical']
            },
            categoryAnalysis: {
                name: 'Category Analysis',
                description: 'Inventory breakdown by categories',
                fields: ['Category', 'Total Items', 'Total Value', 'Average Cost', 'Low Stock Items']
            },
            supplierReport: {
                name: 'Supplier Report',
                description: 'Inventory grouped by suppliers',
                fields: ['Supplier', 'Total Items', 'Total Value', 'Categories', 'Last Order Date']
            },
            shipments: {
                name: 'Shipment Report',
                description: 'All shipment records and status tracking',
                fields: ['Shipment ID', 'Date', 'Supplier', 'Status', 'Total Items', 'Total Cost', 'Received By']
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateScheduledReportsList();
    }
    
    async loadReportData() {
        try {
            const response = await fetch('/api/inventory');
            const data = await response.json();
            
            if (data.success) {
                this.reportData.inventory = data.data;
                this.processReportData();
                return true;
            } else {
                throw new Error(data.error || 'Failed to load report data');
            }
        } catch (error) {
            console.error('Error loading report data:', error);
            notifications.show('Error loading report data', 'error', 5000);
            return false;
        }
    }
    
    processReportData() {
        // Process low stock items
        this.reportData.lowStock = this.reportData.inventory.filter(item => {
            const currentStock = parseFloat(item['Current Stock']) || 0;
            const reorderLevel = parseFloat(item['Reorder Level']) || 0;
            return currentStock <= reorderLevel;
        });
        
        // Process category analysis
        this.reportData.categoryAnalysis = this.processCategoryAnalysis();
        
        // Process supplier report
        this.reportData.supplierReport = this.processSupplierReport();
    }
    
    processCategoryAnalysis() {
        const categoryData = {};
        
        this.reportData.inventory.forEach(item => {
            const category = item.Category || 'Uncategorized';
            const currentStock = parseFloat(item['Current Stock']) || 0;
            const costPerUnit = parseFloat(item['Cost Per Unit']) || 0;
            const reorderLevel = parseFloat(item['Reorder Level']) || 0;
            const totalValue = currentStock * costPerUnit;
            
            if (!categoryData[category]) {
                categoryData[category] = {
                    category: category,
                    totalItems: 0,
                    totalValue: 0,
                    totalCost: 0,
                    lowStockItems: 0
                };
            }
            
            categoryData[category].totalItems++;
            categoryData[category].totalValue += totalValue;
            categoryData[category].totalCost += costPerUnit;
            
            if (currentStock <= reorderLevel) {
                categoryData[category].lowStockItems++;
            }
        });
        
        return Object.values(categoryData).map(cat => ({
            Category: cat.category,
            'Total Items': cat.totalItems,
            'Total Value': cat.totalValue,
            'Average Cost': cat.totalItems > 0 ? (cat.totalCost / cat.totalItems) : 0,
            'Low Stock Items': cat.lowStockItems
        }));
    }
    
    processSupplierReport() {
        const supplierData = {};
        
        this.reportData.inventory.forEach(item => {
            const supplier = item.Supplier || 'Unknown';
            const currentStock = parseFloat(item['Current Stock']) || 0;
            const costPerUnit = parseFloat(item['Cost Per Unit']) || 0;
            const totalValue = currentStock * costPerUnit;
            const category = item.Category || 'Uncategorized';
            
            if (!supplierData[supplier]) {
                supplierData[supplier] = {
                    supplier: supplier,
                    totalItems: 0,
                    totalValue: 0,
                    categories: new Set(),
                    lastOrderDate: 'N/A'
                };
            }
            
            supplierData[supplier].totalItems++;
            supplierData[supplier].totalValue += totalValue;
            supplierData[supplier].categories.add(category);
        });
        
        return Object.values(supplierData).map(sup => ({
            Supplier: sup.supplier,
            'Total Items': sup.totalItems,
            'Total Value': sup.totalValue,
            Categories: Array.from(sup.categories).join(', '),
            'Last Order Date': sup.lastOrderDate
        }));
    }
    
    setupEventListeners() {
        // Export format buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-export-format]')) {
                const format = e.target.dataset.exportFormat;
                const reportType = this.currentReportType || 'inventory';
                this.exportReport(reportType, format);
            }
        });
    }
    
    getReportData(reportType) {
        switch (reportType) {
            case 'inventory':
                return this.reportData.inventory?.map(item => ({
                    Name: item.Name || 'Unnamed Item',
                    Category: item.Category || 'Uncategorized',
                    'Current Stock': parseFloat(item['Current Stock']) || 0,
                    Unit: item.Unit || '-',
                    'Cost Per Unit': parseFloat(item['Cost Per Unit']) || 0,
                    'Total Value': (parseFloat(item['Current Stock']) || 0) * (parseFloat(item['Cost Per Unit']) || 0),
                    Supplier: item.Supplier || 'Unknown',
                    Status: this.getStockStatus(item)
                })) || [];
                
            case 'low-stock':
                return this.reportData.lowStock?.map(item => ({
                    Name: item.Name || 'Unnamed Item',
                    Category: item.Category || 'Uncategorized',
                    'Current Stock': parseFloat(item['Current Stock']) || 0,
                    'Reorder Level': parseFloat(item['Reorder Level']) || 0,
                    Unit: item.Unit || '-',
                    Supplier: item.Supplier || 'Unknown',
                    'Days Until Critical': this.calculateDaysToCritical(item)
                })) || [];
                
            case 'categoryAnalysis':
                return this.reportData.categoryAnalysis || [];
                
            case 'supplierReport':
                return this.reportData.supplierReport || [];
                
            case 'shipments':
                return this.currentReportData || [];
                
            default:
                return this.currentReportData || [];
        }
    }
    
    getStockStatus(item) {
        const currentStock = parseFloat(item['Current Stock']) || 0;
        const reorderLevel = parseFloat(item['Reorder Level']) || 0;
        
        if (currentStock <= 0) return 'Out of Stock';
        if (currentStock <= reorderLevel) return 'Low Stock';
        return 'Healthy';
    }
    
    calculateDaysToCritical(item) {
        const currentStock = parseFloat(item['Current Stock']) || 0;
        const reorderLevel = parseFloat(item['Reorder Level']) || 0;
        
        if (currentStock <= 0) return 0;
        if (currentStock <= reorderLevel) return Math.ceil((currentStock / reorderLevel) * 7);
        return 'N/A';
    }
    
    async exportReport(reportType, format) {
        try {
            let data = this.getReportData(reportType);
            
            // If no cached data, try to load it
            if (!data || data.length === 0) {
                await this.loadReportData();
                data = this.getReportData(reportType);
            }
            
            if (!data || data.length === 0) {
                notifications.show('No data available to export', 'warning', 3000);
                return;
            }
            
            const reportName = this.reportTemplates[reportType]?.name || 'Report';
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${reportName.replace(/\s+/g, '_')}_${timestamp}`;
            
            notifications.show(`Generating ${format.toUpperCase()} report...`, 'info', 3000);
            
            switch (format) {
                case 'pdf':
                    await this.exportToPDF(data, reportName, filename);
                    break;
                case 'excel':
                    await this.exportToExcel(data, reportName, filename);
                    break;
                case 'csv':
                    this.exportToCSV(data, filename);
                    break;
                default:
                    throw new Error('Unsupported export format');
            }
            
            notifications.show(`${format.toUpperCase()} report generated successfully`, 'success', 3000);
            
        } catch (error) {
            console.error('Error exporting report:', error);
            notifications.show(`Error generating ${format.toUpperCase()} report`, 'error', 5000);
        }
    }
    
    async exportToPDF(data, reportName, filename) {
        // Create a comprehensive PDF report
        const printWindow = window.open('', '_blank');
        const headers = Object.keys(data[0]);
        
        // Calculate summary statistics
        let summaryStats = '';
        if (reportName === 'Inventory Report') {
            const totalValue = data.reduce((sum, item) => sum + (item['Total Value'] || 0), 0);
            const lowStockCount = data.filter(item => item.Status === 'Low Stock' || item.Status === 'Out of Stock').length;
            
            summaryStats = `
                <div class="summary-stats">
                    <div class="stat-card">
                        <h3>${data.length}</h3>
                        <p>Total Items</p>
                    </div>
                    <div class="stat-card">
                        <h3>$${totalValue.toFixed(2)}</h3>
                        <p>Total Value</p>
                    </div>
                    <div class="stat-card">
                        <h3>${lowStockCount}</h3>
                        <p>Low Stock Items</p>
                    </div>
                </div>
            `;
        }
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${reportName}</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: white;
                        color: #333;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 40px; 
                        border-bottom: 3px solid #3b82f6;
                        padding-bottom: 20px;
                    }
                    .header h1 { 
                        color: #3b82f6; 
                        margin: 0; 
                        font-size: 2.5rem;
                        font-weight: 700;
                    }
                    .header .subtitle {
                        color: #6b7280;
                        font-size: 1.1rem;
                        margin: 10px 0;
                    }
                    .header .meta { 
                        color: #9ca3af; 
                        font-size: 0.9rem;
                        margin-top: 15px;
                    }
                    .summary-stats {
                        display: flex;
                        justify-content: space-around;
                        margin: 30px 0;
                        gap: 20px;
                    }
                    .stat-card {
                        background: linear-gradient(135deg, #3b82f6, #1e40af);
                        color: white;
                        padding: 20px;
                        border-radius: 12px;
                        text-align: center;
                        flex: 1;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }
                    .stat-card h3 {
                        margin: 0 0 5px 0;
                        font-size: 2rem;
                        font-weight: bold;
                    }
                    .stat-card p {
                        margin: 0;
                        opacity: 0.9;
                        font-size: 0.9rem;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 30px;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        border-radius: 8px;
                        overflow: hidden;
                    }
                    th { 
                        background: linear-gradient(135deg, #3b82f6, #1e40af); 
                        color: white; 
                        padding: 15px 12px;
                        text-align: left;
                        font-weight: 600;
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    td { 
                        border-bottom: 1px solid #e5e7eb; 
                        padding: 12px; 
                        font-size: 0.9rem;
                    }
                    tr:nth-child(even) { 
                        background-color: #f9fafb; 
                    }
                    tr:hover {
                        background-color: #f3f4f6;
                    }
                    .status-badge {
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 0.75rem;
                        font-weight: 500;
                        text-transform: uppercase;
                    }
                    .status-healthy { background-color: #dcfce7; color: #166534; }
                    .status-low { background-color: #fef3c7; color: #92400e; }
                    .status-out { background-color: #fee2e2; color: #991b1b; }
                    .footer { 
                        margin-top: 50px; 
                        text-align: center; 
                        padding-top: 20px;
                        border-top: 2px solid #e5e7eb;
                        color: #6b7280;
                        font-size: 0.9rem;
                    }
                    .footer .brand {
                        font-weight: 600;
                        color: #3b82f6;
                        margin-bottom: 5px;
                    }
                    .print-info {
                        background: #f3f4f6;
                        padding: 15px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #3b82f6;
                    }
                    @media print {
                        .no-print { display: none; }
                        body { margin: 0; padding: 15px; font-size: 11px; }
                        .header h1 { font-size: 2rem; }
                        .stat-card { padding: 15px; }
                        .stat-card h3 { font-size: 1.5rem; }
                        th, td { padding: 8px; font-size: 0.8rem; }
                        .print-info { background: none; border: 1px solid #ddd; }
                        @page { margin: 1cm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${reportName}</h1>
                    <div class="subtitle">InvenTrack Restaurant Pro</div>
                    <div class="meta">
                        Generated on: ${new Date().toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                </div>
                
                <div class="print-info no-print">
                    <strong>📊 Report Summary:</strong> This report contains ${data.length} records. 
                    Use your browser's print function (Ctrl+P) to save as PDF or print.
                </div>
                
                ${summaryStats}
                
                <table>
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${headers.map(header => {
                                    let value = row[header];
                                    let cellClass = '';
                                    
                                    if (header === 'Status') {
                                        cellClass = value === 'Healthy' ? 'status-healthy' : 
                                                   value === 'Low Stock' ? 'status-low' : 'status-out';
                                        value = `<span class="status-badge ${cellClass}">${value}</span>`;
                                    } else if (typeof value === 'number' && header.toLowerCase().includes('value')) {
                                        value = '$' + value.toFixed(2);
                                    } else if (typeof value === 'number') {
                                        value = value.toLocaleString();
                                    }
                                    
                                    return `<td>${value || '-'}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <div class="brand">InvenTrack Restaurant Pro</div>
                    <div>Professional Inventory Management Solution</div>
                    <div style="margin-top: 10px;">
                        Total Records: ${data.length} | 
                        Report Type: ${reportName} | 
                        © 2024 InvenTrack
                    </div>
                </div>
                
                <script>
                    // Auto-focus and show print dialog after loading
                    window.onload = function() {
                        window.focus();
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    }
    
    async exportToExcel(data, reportName, filename) {
        // Create Excel-compatible CSV with proper formatting
        const headers = Object.keys(data[0]);
        const timestamp = new Date().toISOString();
        
        // Add metadata rows
        const metadataRows = [
            ['Report Name', reportName],
            ['Generated On', new Date().toLocaleString()],
            ['Total Records', data.length],
            ['Generated By', 'InvenTrack Restaurant Pro'],
            [''], // Empty row for spacing
            headers // Header row
        ];
        
        const csvContent = [
            ...metadataRows.map(row => row.join(',')),
            ...data.map(row => 
                headers.map(header => {
                    let value = row[header];
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            )
        ].join('\n');
        
        // Add BOM for proper Excel encoding
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8;' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`; // Excel will recognize this as a spreadsheet
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
    
    exportToCSV(data, filename) {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    let value = row[header];
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
    
    scheduleReport(reportType, format, frequency) {
        const schedule = {
            reportType,
            format,
            frequency,
            nextRun: this.calculateNextRun(frequency),
            createdAt: new Date().toISOString()
        };
        
        const scheduledReports = JSON.parse(localStorage.getItem('scheduledReports') || '[]');
        scheduledReports.push(schedule);
        localStorage.setItem('scheduledReports', JSON.stringify(scheduledReports));
        
        notifications.show(`Report scheduled to run ${frequency}`, 'success', 3000);
        this.updateScheduledReportsList();
    }
    
    calculateNextRun(frequency) {
        const now = new Date();
        switch (frequency) {
            case 'daily':
                now.setDate(now.getDate() + 1);
                break;
            case 'weekly':
                now.setDate(now.getDate() + 7);
                break;
            case 'monthly':
                now.setMonth(now.getMonth() + 1);
                break;
        }
        return now.toISOString();
    }
    
    updateScheduledReportsList() {
        const container = document.getElementById('scheduledReportsList');
        if (!container) return;
        
        const scheduledReports = JSON.parse(localStorage.getItem('scheduledReports') || '[]');
        
        if (scheduledReports.length === 0) {
            container.innerHTML = '<p class="text-muted">No scheduled reports</p>';
            return;
        }
        
        const html = scheduledReports.map((report, index) => `
            <div class="card mb-2">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${this.reportTemplates[report.reportType]?.name || report.reportType}</strong>
                            <small class="text-muted d-block">${report.format.toUpperCase()} • ${report.frequency}</small>
                        </div>
                        <div>
                            <small class="text-muted">Next: ${new Date(report.nextRun).toLocaleDateString()}</small>
                            <button class="btn btn-sm btn-outline-danger ms-2" onclick="reportManager.removeScheduledReport(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    removeScheduledReport(index) {
        const scheduledReports = JSON.parse(localStorage.getItem('scheduledReports') || '[]');
        scheduledReports.splice(index, 1);
        localStorage.setItem('scheduledReports', JSON.stringify(scheduledReports));
        this.updateScheduledReportsList();
        notifications.show('Scheduled report removed', 'info', 2000);
    }
}

// Legacy functions for existing report functionality
let currentReportData = null;
let currentReportType = null;
let reportManager;

document.addEventListener('DOMContentLoaded', function() {
    reportManager = new ReportManager();
});

async function generateInventoryReport() {
    showReportLoading('Inventory Report');
    
    try {
        const inventory = await loadData('/api/inventory');
        currentReportData = inventory;
        currentReportType = 'inventory';
        
        // Update report manager data
        if (reportManager) {
            reportManager.reportData.inventory = inventory;
            reportManager.currentReportData = inventory;
            reportManager.currentReportType = 'inventory';
            reportManager.processReportData();
        }
        
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
        
        // Update report manager data
        if (reportManager) {
            reportManager.currentReportData = lowStockItems;
            reportManager.currentReportType = 'low-stock';
        }
        
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
        
        // Update report manager data
        if (reportManager) {
            reportManager.currentReportData = shipments;
            reportManager.currentReportType = 'shipments';
        }
        
        displayShipmentReport(shipments);
        showReportActions();
    } catch (error) {
        showReportError('Failed to generate shipment report');
    }
}

async function generateMovementReport() {
    showReportLoading('Stock Movement Report');
    
    try {
        notifications.show('Stock movement report feature coming soon!', 'info', 3000);
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
    
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => 
        sum + (parseFloat(item['Current Stock']) * parseFloat(item['Cost Per Unit'])), 0);
    const lowStockCount = inventory.filter(item => 
        parseFloat(item['Current Stock']) <= parseFloat(item['Reorder Level'])).length;
    
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
    if (!reportManager || !currentReportData || currentReportData.length === 0) {
        notifications.show('No data to export', 'warning', 3000);
        return;
    }
    
    reportManager.exportReport(currentReportType, 'csv');
}

function printReport() {
    if (!currentReportData) {
        notifications.show('No report to print', 'warning', 3000);
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

// Enhanced export functions
function exportToPDF() {
    if (reportManager && currentReportType) {
        reportManager.exportReport(currentReportType, 'pdf');
    }
}

function exportToExcel() {
    if (reportManager && currentReportType) {
        reportManager.exportReport(currentReportType, 'excel');
    }
}

function exportToCSV() {
    if (reportManager && currentReportType) {
        reportManager.exportReport(currentReportType, 'csv');
    }
}