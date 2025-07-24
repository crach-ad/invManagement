# Restaurant Inventory Management System

A web-based inventory management system designed specifically for restaurants, using Google Sheets as the backend database. This system allows you to track inventory levels, manage shipments, handle transfers between locations, and generate comprehensive reports.

## Features

### 📦 Inventory Management
- Add, edit, and delete inventory items
- Track stock levels with automatic low-stock alerts
- Categorize items (food, beverages, supplies, etc.)
- Set reorder levels and monitor supplier information
- Real-time stock updates with movement logging

### 🚚 Shipment Management
- Record incoming shipments from suppliers
- Update inventory levels automatically upon receipt
- Track shipment status (Pending, Received, Partial)
- Manage supplier information and delivery schedules

### 🔄 Transfer Management
- Handle inventory transfers between locations/storage areas
- Track movement history with approval workflows
- Monitor pending and completed transfers
- Location-based inventory tracking

### 📊 Reports & Analytics
- Comprehensive inventory reports with value calculations
- Low stock alerts and reorder recommendations
- Shipment tracking and supplier performance
- Export data to CSV for external analysis
- Print-friendly report formats

### 🌐 Web Interface
- Responsive design works on desktop and mobile
- Intuitive dashboard with quick stats
- Search and filter capabilities
- Real-time updates and notifications

## Technology Stack

- **Backend**: Python Flask with REST API
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome 6
- **Database**: Google Sheets API
- **Authentication**: Google Service Account

## Prerequisites

- Python 3.8 or higher
- Google Cloud Console account
- Google Sheets API enabled
- Modern web browser

## Installation

### 1. Clone or Download
Download this project to your local machine.

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Google Sheets Setup

#### A. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Enable the Google Drive API

#### B. Create Service Account
1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Give it a name (e.g., "inventory-system")
4. Grant "Editor" role
5. Create and download the JSON key file
6. Save as `credentials.json` in the project root

#### C. Create Google Spreadsheet
1. Create a new Google Spreadsheet
2. Copy the spreadsheet ID from the URL
3. Share the spreadsheet with your service account email (found in credentials.json)
4. Give "Editor" permissions

### 4. Environment Configuration
1. Copy `.env.example` to `.env`
2. Update the values:
```
GOOGLE_CREDENTIALS_FILE=credentials.json
SPREADSHEET_ID=your_google_sheets_id_here
SECRET_KEY=your-secret-key-here
DEBUG=True
HOST=0.0.0.0
PORT=5000
```

### 5. Run the Application
```bash
python app.py
```

Visit `http://localhost:5000` in your web browser.

## Usage

### First Time Setup
When you first run the application, it will automatically create the required sheets in your Google Spreadsheet:
- **Inventory**: Main inventory tracking
- **Shipments**: Incoming shipment records
- **Transfers**: Transfer between locations
- **Stock_Movements**: Activity log
- **Suppliers**: Supplier information

### Adding Inventory Items
1. Go to the Inventory page
2. Click "Add New Item"
3. Fill in item details:
   - Name (required)
   - Category (required)
   - Current Stock (required)
   - Unit (required)
   - Cost per Unit
   - Reorder Level
   - Supplier

### Managing Shipments
1. Go to the Shipments page
2. Click "New Shipment"
3. Enter shipment details
4. When received, click the check mark to process
5. Add items and quantities received

### Creating Transfers
1. Go to the Transfers page
2. Click "New Transfer"
3. Specify source and destination locations
4. Enter item ID and quantity
5. Complete the transfer when finished

### Viewing Reports
1. Go to the Reports page
2. Select report type:
   - Inventory Report: Complete stock overview
   - Low Stock Report: Items needing reorder
   - Shipment Report: Delivery tracking
3. Export to CSV or print as needed

## Project Structure

```
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
├── README.md             # This file
├── config/
│   └── settings.py       # Configuration settings
├── sheets_api/
│   └── google_sheets.py  # Google Sheets integration
├── inventory/
│   └── models.py         # Inventory management logic
├── shipments/
│   └── models.py         # Shipment management logic
├── transfers/
│   └── models.py         # Transfer management logic
├── templates/            # HTML templates
│   ├── base.html
│   ├── index.html
│   ├── inventory.html
│   ├── shipments.html
│   ├── transfers.html
│   └── reports.html
└── static/              # CSS, JavaScript, images
    ├── css/
    │   └── styles.css
    └── js/
        ├── main.js
        ├── inventory.js
        ├── shipments.js
        ├── transfers.js
        └── reports.js
```

## API Endpoints

### Inventory
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Add new item
- `PUT /api/inventory/<id>` - Update item
- `DELETE /api/inventory/<id>` - Delete item

### Shipments
- `GET /api/shipments` - Get all shipments
- `POST /api/shipments` - Create new shipment
- `POST /api/shipments/<id>/receive` - Mark as received

### Transfers
- `GET /api/transfers` - Get all transfers
- `POST /api/transfers` - Create new transfer
- `POST /api/transfers/<id>/complete` - Complete transfer

### Reports
- `GET /api/stock-check` - Get low stock items

## Customization

### Adding New Categories
Simply enter new category names when adding inventory items. The system will automatically track all unique categories.

### Modifying Fields
To add custom fields:
1. Update the Google Sheets headers
2. Modify the corresponding model in the respective Python file
3. Update the HTML forms and JavaScript

### Styling
Customize the appearance by editing `static/css/styles.css`. The system uses Bootstrap 5 for responsive design.

## Troubleshooting

### Common Issues

1. **Google Sheets API errors**
   - Verify service account has access to the spreadsheet
   - Check that both Sheets and Drive APIs are enabled
   - Ensure credentials.json is in the correct location

2. **"Sheet not found" errors**
   - The application will create missing sheets automatically
   - Verify the spreadsheet ID is correct
   - Check that the service account has edit permissions

3. **Import errors**
   - Run `pip install -r requirements.txt`
   - Verify Python version is 3.8+

4. **Port already in use**
   - Change the PORT in your .env file
   - Or kill the process using the port

### Getting Help
If you encounter issues:
1. Check the browser console for JavaScript errors
2. Check the Python console for server errors
3. Verify your Google Sheets setup
4. Ensure all dependencies are installed

## Security Notes

- Keep your `credentials.json` file secure and never commit to version control
- Use a strong SECRET_KEY in production
- Consider implementing user authentication for production use
- Regularly review service account permissions

## License

This project is provided as-is for educational and business use. Feel free to modify and adapt to your needs.

## Contributing

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Roadmap

Future enhancements may include:
- User authentication and role-based access
- Mobile app companion
- Integration with POS systems
- Advanced analytics and forecasting
- Multi-location inventory tracking
- Barcode scanning support