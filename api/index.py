import sys
import os

# Add the parent directory to the Python path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime
import json
from functools import wraps

# Import our custom modules
from config.settings import Config
from sheets_api.google_sheets import SheetsManager
from inventory.models import InventoryManager
from shipments.models import ShipmentManager
from transfers.models import TransferManager
from auth.auth_manager import AuthManager

# Configure Flask with correct template and static paths for Vercel
template_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'templates')
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static')

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

# Load environment variables
load_dotenv()

app.config.from_object(Config)

# Configure Flask built-in sessions (no Flask-Session needed)
app.config['SESSION_PERMANENT'] = False

CORS(app)

# Initialize managers
sheets_manager = SheetsManager()
inventory_manager = InventoryManager(sheets_manager)
shipment_manager = ShipmentManager(sheets_manager)
transfer_manager = TransferManager(sheets_manager)
auth_manager = AuthManager(sheets_manager)

# Create default admin user if needed
auth_manager.create_default_admin()

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Please enter both username and password', 'error')
            return render_template('auth/login.html')
        
        user = auth_manager.validate_user(username, password)
        if user:
            session['user'] = user
            flash(f'Welcome, {user["username"]}!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password', 'error')
            return render_template('auth/login.html')
    
    # If user is already logged in, redirect to dashboard
    if 'user' in session:
        return redirect(url_for('index'))
    
    return render_template('auth/login.html')

@app.route('/logout')
def logout():
    username = session.get('user', {}).get('username', 'Unknown')
    session.clear()
    flash(f'Goodbye, {username}!', 'info')
    return redirect(url_for('login'))

# Main application routes
@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/inventory')
@login_required
def inventory():
    return render_template('inventory.html')

@app.route('/shipments')
@login_required
def shipments():
    return render_template('shipments.html')

@app.route('/transfers')
@login_required
def transfers():
    return render_template('transfers.html')

@app.route('/reports')
@login_required
def reports():
    return render_template('reports.html')

# API Routes
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    try:
        items = inventory_manager.get_all_items()
        return jsonify({'success': True, 'data': items})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/inventory', methods=['POST'])
def add_inventory_item():
    try:
        data = request.json
        item_id = inventory_manager.add_item(data)
        return jsonify({'success': True, 'item_id': item_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/inventory/<item_id>', methods=['PUT'])
def update_inventory_item(item_id):
    try:
        data = request.json
        success = inventory_manager.update_item(item_id, data)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/inventory/<item_id>', methods=['DELETE'])
def delete_inventory_item(item_id):
    try:
        success = inventory_manager.delete_item(item_id)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/shipments', methods=['GET'])
def get_shipments():
    try:
        shipments = shipment_manager.get_all_shipments()
        return jsonify({'success': True, 'data': shipments})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/shipments', methods=['POST'])
def add_shipment():
    try:
        data = request.json
        shipment_id = shipment_manager.add_shipment(data)
        return jsonify({'success': True, 'shipment_id': shipment_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/transfers', methods=['GET'])
def get_transfers():
    try:
        transfers = transfer_manager.get_all_transfers()
        return jsonify({'success': True, 'data': transfers})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/transfers', methods=['POST'])
def add_transfer():
    try:
        data = request.json
        transfer_id = transfer_manager.add_transfer(data)
        return jsonify({'success': True, 'transfer_id': transfer_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/shipments/<shipment_id>/receive', methods=['POST'])
def receive_shipment(shipment_id):
    try:
        data = request.json
        items_received = data.get('items_received', [])
        received_by = data.get('received_by', '')
        
        success = shipment_manager.receive_shipment(shipment_id, items_received, received_by)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/transfers/<transfer_id>/complete', methods=['POST'])
def complete_transfer(transfer_id):
    try:
        success = transfer_manager.complete_transfer(transfer_id)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/transfers/<transfer_id>/status', methods=['PUT'])
def update_transfer_status(transfer_id):
    try:
        data = request.json
        status = data.get('status', '')
        success = transfer_manager.update_transfer_status(transfer_id, status)
        return jsonify({'success': success})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stock-check')
def stock_check():
    try:
        low_stock_items = inventory_manager.get_low_stock_items()
        return jsonify({'success': True, 'data': low_stock_items})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/populate-demo-data', methods=['POST'])
@login_required
def populate_demo_data():
    """Populate realistic restaurant inventory sample data for demo purposes"""
    try:
        # Sample restaurant inventory data
        demo_items = [
            # Fresh Produce
            {'Name': 'Tomatoes - Roma', 'Category': 'Fresh Produce', 'Current Stock': 45, 'Unit': 'lbs', 'Cost Per Unit': 2.50, 'Reorder Level': 20, 'Supplier': 'Fresh Valley Farms'},
            {'Name': 'Lettuce - Iceberg', 'Category': 'Fresh Produce', 'Current Stock': 12, 'Unit': 'heads', 'Cost Per Unit': 1.85, 'Reorder Level': 15, 'Supplier': 'Fresh Valley Farms'},
            {'Name': 'Onions - Yellow', 'Category': 'Fresh Produce', 'Current Stock': 8, 'Unit': 'lbs', 'Cost Per Unit': 1.20, 'Reorder Level': 15, 'Supplier': 'Garden State Produce'},
            {'Name': 'Bell Peppers - Red', 'Category': 'Fresh Produce', 'Current Stock': 24, 'Unit': 'lbs', 'Cost Per Unit': 3.75, 'Reorder Level': 10, 'Supplier': 'Fresh Valley Farms'},
            {'Name': 'Mushrooms - Button', 'Category': 'Fresh Produce', 'Current Stock': 6, 'Unit': 'lbs', 'Cost Per Unit': 4.20, 'Reorder Level': 8, 'Supplier': 'Fungi Fresh Co'},
            
            # Proteins
            {'Name': 'Chicken Breast - Boneless', 'Category': 'Proteins', 'Current Stock': 35, 'Unit': 'lbs', 'Cost Per Unit': 6.50, 'Reorder Level': 25, 'Supplier': 'Premium Poultry Co'},
            {'Name': 'Ground Beef - 80/20', 'Category': 'Proteins', 'Current Stock': 18, 'Unit': 'lbs', 'Cost Per Unit': 5.85, 'Reorder Level': 20, 'Supplier': 'Midwest Meats'},
            {'Name': 'Salmon Fillets - Atlantic', 'Category': 'Proteins', 'Current Stock': 12, 'Unit': 'lbs', 'Cost Per Unit': 14.50, 'Reorder Level': 8, 'Supplier': 'Ocean Fresh Seafood'},
            {'Name': 'Shrimp - Large Peeled', 'Category': 'Proteins', 'Current Stock': 5, 'Unit': 'lbs', 'Cost Per Unit': 12.75, 'Reorder Level': 10, 'Supplier': 'Ocean Fresh Seafood'},
            {'Name': 'Bacon - Thick Cut', 'Category': 'Proteins', 'Current Stock': 22, 'Unit': 'lbs', 'Cost Per Unit': 8.25, 'Reorder Level': 15, 'Supplier': 'Artisan Smokehouse'},
            
            # Dairy & Eggs
            {'Name': 'Milk - Whole 2%', 'Category': 'Dairy & Eggs', 'Current Stock': 8, 'Unit': 'gallons', 'Cost Per Unit': 3.25, 'Reorder Level': 12, 'Supplier': 'Creamery Fresh'},
            {'Name': 'Cheddar Cheese - Sharp', 'Category': 'Dairy & Eggs', 'Current Stock': 15, 'Unit': 'lbs', 'Cost Per Unit': 7.50, 'Reorder Level': 10, 'Supplier': 'Artisan Cheese Co'},
            {'Name': 'Eggs - Large Grade A', 'Category': 'Dairy & Eggs', 'Current Stock': 24, 'Unit': 'dozen', 'Cost Per Unit': 2.85, 'Reorder Level': 18, 'Supplier': 'Happy Hen Farms'},
            {'Name': 'Butter - Unsalted', 'Category': 'Dairy & Eggs', 'Current Stock': 12, 'Unit': 'lbs', 'Cost Per Unit': 4.75, 'Reorder Level': 8, 'Supplier': 'Creamery Fresh'},
            {'Name': 'Heavy Cream', 'Category': 'Dairy & Eggs', 'Current Stock': 6, 'Unit': 'quarts', 'Cost Per Unit': 3.95, 'Reorder Level': 10, 'Supplier': 'Creamery Fresh'},
            
            # Pantry & Dry Goods
            {'Name': 'Flour - All Purpose', 'Category': 'Pantry & Dry Goods', 'Current Stock': 3, 'Unit': '25lb bags', 'Cost Per Unit': 12.50, 'Reorder Level': 5, 'Supplier': 'Wholesale Food Supply'},
            {'Name': 'Rice - Jasmine', 'Category': 'Pantry & Dry Goods', 'Current Stock': 42, 'Unit': 'lbs', 'Cost Per Unit': 1.85, 'Reorder Level': 25, 'Supplier': 'Asian Market Supply'},
            {'Name': 'Olive Oil - Extra Virgin', 'Category': 'Pantry & Dry Goods', 'Current Stock': 8, 'Unit': 'liters', 'Cost Per Unit': 15.75, 'Reorder Level': 6, 'Supplier': 'Mediterranean Imports'},
            {'Name': 'Salt - Sea Salt', 'Category': 'Pantry & Dry Goods', 'Current Stock': 18, 'Unit': 'lbs', 'Cost Per Unit': 3.25, 'Reorder Level': 12, 'Supplier': 'Spice World'},
            {'Name': 'Black Pepper - Ground', 'Category': 'Pantry & Dry Goods', 'Current Stock': 4, 'Unit': 'lbs', 'Cost Per Unit': 18.50, 'Reorder Level': 3, 'Supplier': 'Spice World'},
            
            # Beverages
            {'Name': 'Coffee Beans - House Blend', 'Category': 'Beverages', 'Current Stock': 25, 'Unit': 'lbs', 'Cost Per Unit': 12.50, 'Reorder Level': 15, 'Supplier': 'Roasters Premium'},
            {'Name': 'Orange Juice - Fresh', 'Category': 'Beverages', 'Current Stock': 12, 'Unit': 'gallons', 'Cost Per Unit': 8.75, 'Reorder Level': 8, 'Supplier': 'Citrus Fresh'},
            {'Name': 'Wine - House Red', 'Category': 'Beverages', 'Current Stock': 36, 'Unit': 'bottles', 'Cost Per Unit': 15.25, 'Reorder Level': 24, 'Supplier': 'Valley Vineyards'},
            {'Name': 'Sparkling Water', 'Category': 'Beverages', 'Current Stock': 48, 'Unit': 'bottles', 'Cost Per Unit': 1.25, 'Reorder Level': 36, 'Supplier': 'Premium Waters'},
            
            # Frozen Items
            {'Name': 'French Fries - Crispy Cut', 'Category': 'Frozen Items', 'Current Stock': 15, 'Unit': '5lb bags', 'Cost Per Unit': 8.50, 'Reorder Level': 12, 'Supplier': 'Frozen Foods Inc'},
            {'Name': 'Ice Cream - Vanilla', 'Category': 'Frozen Items', 'Current Stock': 8, 'Unit': 'gallons', 'Cost Per Unit': 12.75, 'Reorder Level': 6, 'Supplier': 'Sweet Dreams Creamery'},
            {'Name': 'Pizza Dough - Pre-made', 'Category': 'Frozen Items', 'Current Stock': 24, 'Unit': 'pieces', 'Cost Per Unit': 2.25, 'Reorder Level': 18, 'Supplier': 'Dough Masters'},
            
            # Paper & Disposables
            {'Name': 'Napkins - Dinner Size', 'Category': 'Paper & Disposables', 'Current Stock': 2400, 'Unit': 'pieces', 'Cost Per Unit': 0.02, 'Reorder Level': 1000, 'Supplier': 'Restaurant Supply Co'},
            {'Name': 'To-Go Containers - Large', 'Category': 'Paper & Disposables', 'Current Stock': 350, 'Unit': 'pieces', 'Cost Per Unit': 0.45, 'Reorder Level': 200, 'Supplier': 'EcoPackaging Solutions'},
            {'Name': 'Aluminum Foil - Heavy Duty', 'Category': 'Paper & Disposables', 'Current Stock': 6, 'Unit': 'rolls', 'Cost Per Unit': 24.50, 'Reorder Level': 4, 'Supplier': 'Restaurant Supply Co'},
            
            # Cleaning Supplies
            {'Name': 'Dish Soap - Commercial', 'Category': 'Cleaning Supplies', 'Current Stock': 4, 'Unit': 'gallons', 'Cost Per Unit': 18.75, 'Reorder Level': 3, 'Supplier': 'CleanTech Solutions'},
            {'Name': 'Sanitizer - Food Safe', 'Category': 'Cleaning Supplies', 'Current Stock': 8, 'Unit': 'gallons', 'Cost Per Unit': 22.50, 'Reorder Level': 5, 'Supplier': 'CleanTech Solutions'},
            {'Name': 'Paper Towels - Industrial', 'Category': 'Cleaning Supplies', 'Current Stock': 24, 'Unit': 'rolls', 'Cost Per Unit': 3.25, 'Reorder Level': 18, 'Supplier': 'Restaurant Supply Co'}
        ]
        
        # Clear existing data and add demo data
        success_count = 0
        for item in demo_items:
            try:
                inventory_manager.add_item(item)
                success_count += 1
            except Exception as item_error:
                print(f"Error adding item {item['Name']}: {str(item_error)}")
                continue
        
        return jsonify({
            'success': True, 
            'message': f'Successfully populated {success_count} demo items',
            'total_items': len(demo_items)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# For Vercel deployment - export the Flask app
app.config['SERVER_NAME'] = None  # Important for Vercel

# This is the WSGI application that Vercel will use
if __name__ == '__main__':
    app.run(debug=True)
else:
    # For Vercel serverless deployment
    from werkzeug.middleware.proxy_fix import ProxyFix
    app = ProxyFix(app, x_for=1, x_proto=1, x_host=1, x_prefix=1)