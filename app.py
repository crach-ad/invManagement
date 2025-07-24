from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_cors import CORS
import os
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

# Load environment variables
load_dotenv()

app = Flask(__name__)
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)