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

app = Flask(__name__)

# Load environment variables first
load_dotenv()

# Basic Flask configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'restaurant-inventory-secret-key-2024')
app.config['SESSION_PERMANENT'] = False

CORS(app)

# Step 1: Test basic functionality
@app.route('/')
def index():
    return "<h1>✅ Basic Flask Working</h1><p><a href='/step1'>Test Step 1: Config Import</a></p>"

@app.route('/step1')
def step1():
    try:
        from config.settings import Config
        return f"""
        <h1>✅ Step 1: Config Import Success</h1>
        <p>Config loaded successfully</p>
        <p>Spreadsheet ID: {Config.SPREADSHEET_ID}</p>
        <p><a href="/step2">Test Step 2: Google Sheets Manager</a></p>
        """
    except Exception as e:
        return f"<h1>❌ Step 1 Failed</h1><p>Error: {str(e)}</p>"

@app.route('/step2')
def step2():
    try:
        from config.settings import Config
        from sheets_api.google_sheets import SheetsManager
        
        sheets_manager = SheetsManager()
        return f"""
        <h1>✅ Step 2: Sheets Manager Success</h1>
        <p>Google Sheets connection established</p>
        <p><a href="/step3">Test Step 3: Initialize Managers</a></p>
        """
    except Exception as e:
        return f"<h1>❌ Step 2 Failed</h1><p>Error: {str(e)}</p>"

@app.route('/step3')
def step3():
    try:
        from config.settings import Config
        from sheets_api.google_sheets import SheetsManager
        from inventory.models import InventoryManager
        from shipments.models import ShipmentManager
        from transfers.models import TransferManager
        from auth.auth_manager import AuthManager
        
        sheets_manager = SheetsManager()
        inventory_manager = InventoryManager(sheets_manager)
        shipment_manager = ShipmentManager(sheets_manager)
        transfer_manager = TransferManager(sheets_manager)
        auth_manager = AuthManager(sheets_manager)
        
        return f"""
        <h1>✅ Step 3: All Managers Success</h1>
        <p>All managers initialized successfully</p>
        <p><a href="/step4">Test Step 4: Create Admin</a></p>
        """
    except Exception as e:
        return f"<h1>❌ Step 3 Failed</h1><p>Error: {str(e)}</p>"

@app.route('/step4')
def step4():
    try:
        from config.settings import Config
        from sheets_api.google_sheets import SheetsManager
        from auth.auth_manager import AuthManager
        
        sheets_manager = SheetsManager()
        auth_manager = AuthManager(sheets_manager)
        
        # This might be the problematic line
        result = auth_manager.create_default_admin()
        
        return f"""
        <h1>✅ Step 4: Admin Creation Success</h1>
        <p>Default admin creation result: {result}</p>
        <p><a href="/login">Test Login Page</a></p>
        """
    except Exception as e:
        return f"<h1>❌ Step 4 Failed</h1><p>Error: {str(e)}</p><p>This might be our problem!</p>"

@app.route('/login')
def login():
    try:
        return render_template('auth/login.html')
    except Exception as e:
        return f"<h1>❌ Template Error</h1><p>Error: {str(e)}</p><p>Login template not found or error in template</p>"