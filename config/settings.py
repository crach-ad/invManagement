import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    GOOGLE_CREDENTIALS_FILE = os.environ.get('GOOGLE_CREDENTIALS_FILE') or 'credentials.json'
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    
    # Sheet names
    INVENTORY_SHEET = 'Inventory'
    SHIPMENTS_SHEET = 'Shipments'
    TRANSFERS_SHEET = 'Transfers'
    STOCK_MOVEMENTS_SHEET = 'Stock_Movements'
    SUPPLIERS_SHEET = 'Suppliers'
    
    # Application settings
    DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))