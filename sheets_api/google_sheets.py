import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import json
import os
from config.settings import Config

class SheetsManager:
    def __init__(self):
        self.credentials_file = Config.GOOGLE_CREDENTIALS_FILE
        self.spreadsheet_id = Config.SPREADSHEET_ID
        self.gc = None
        self.spreadsheet = None
        self._initialize_connection()
    
    def _initialize_connection(self):
        """Initialize connection to Google Sheets"""
        try:
            # Define the scope
            scope = [
                'https://spreadsheets.google.com/feeds',
                'https://www.googleapis.com/auth/drive'
            ]
            
            # Load credentials
            if os.path.exists(self.credentials_file):
                creds = Credentials.from_service_account_file(self.credentials_file, scopes=scope)
                self.gc = gspread.authorize(creds)
                
                if self.spreadsheet_id:
                    self.spreadsheet = self.gc.open_by_key(self.spreadsheet_id)
                    self._ensure_sheets_exist()
                else:
                    print("Warning: SPREADSHEET_ID not set in environment variables")
            else:
                print(f"Warning: Credentials file {self.credentials_file} not found")
        except Exception as e:
            print(f"Error initializing Google Sheets connection: {e}")
    
    def _ensure_sheets_exist(self):
        """Ensure all required sheets exist with proper headers"""
        sheets_config = {
            Config.INVENTORY_SHEET: [
                'Item ID', 'Name', 'Category', 'Current Stock', 'Unit', 
                'Cost Per Unit', 'Reorder Level', 'Supplier', 'Last Updated'
            ],
            Config.SHIPMENTS_SHEET: [
                'Shipment ID', 'Date', 'Supplier', 'Status', 'Total Items', 
                'Total Cost', 'Received By', 'Notes'
            ],
            Config.TRANSFERS_SHEET: [
                'Transfer ID', 'Date', 'From Location', 'To Location', 
                'Item ID', 'Item Name', 'Quantity', 'Status', 'Notes'
            ],
            Config.STOCK_MOVEMENTS_SHEET: [
                'Timestamp', 'Item ID', 'Item Name', 'Action Type', 
                'Quantity Change', 'New Stock Level', 'Reference ID', 'Notes'
            ],
            Config.SUPPLIERS_SHEET: [
                'Supplier ID', 'Name', 'Contact Person', 'Phone', 
                'Email', 'Address', 'Payment Terms', 'Active'
            ],
            Config.USERS_SHEET: [
                'Username', 'Password', 'Role', 'Active', 'Last Login', 'Created Date'
            ]
        }
        
        try:
            existing_sheets = [sheet.title for sheet in self.spreadsheet.worksheets()]
            
            for sheet_name, headers in sheets_config.items():
                if sheet_name not in existing_sheets:
                    # Create the sheet
                    worksheet = self.spreadsheet.add_worksheet(title=sheet_name, rows=1000, cols=len(headers))
                    # Add headers
                    worksheet.append_row(headers)
                    print(f"Created sheet: {sheet_name}")
                else:
                    # Check if headers exist, if not add them
                    worksheet = self.spreadsheet.worksheet(sheet_name)
                    if worksheet.row_count == 0 or not worksheet.row_values(1):
                        worksheet.append_row(headers)
                        print(f"Added headers to existing sheet: {sheet_name}")
        except Exception as e:
            print(f"Error ensuring sheets exist: {e}")
    
    def get_worksheet(self, sheet_name):
        """Get a specific worksheet"""
        try:
            return self.spreadsheet.worksheet(sheet_name)
        except Exception as e:
            print(f"Error getting worksheet {sheet_name}: {e}")
            return None
    
    def append_row(self, sheet_name, data):
        """Append a row to a specific sheet"""
        try:
            worksheet = self.get_worksheet(sheet_name)
            if worksheet:
                worksheet.append_row(data)
                return True
            return False
        except Exception as e:
            print(f"Error appending row to {sheet_name}: {e}")
            return False
    
    def get_all_records(self, sheet_name):
        """Get all records from a sheet as list of dictionaries"""
        try:
            worksheet = self.get_worksheet(sheet_name)
            if worksheet:
                return worksheet.get_all_records()
            return []
        except Exception as e:
            print(f"Error getting records from {sheet_name}: {e}")
            return []
    
    def update_row(self, sheet_name, row_number, data):
        """Update a specific row in a sheet"""
        try:
            worksheet = self.get_worksheet(sheet_name)
            if worksheet:
                # Convert data to list if it's a dictionary
                if isinstance(data, dict):
                    headers = worksheet.row_values(1)
                    data_list = [data.get(header, '') for header in headers]
                else:
                    data_list = data
                
                # Update the row
                for col, value in enumerate(data_list, 1):
                    worksheet.update_cell(row_number, col, value)
                return True
            return False
        except Exception as e:
            print(f"Error updating row in {sheet_name}: {e}")
            return False
    
    def delete_row(self, sheet_name, row_number):
        """Delete a specific row from a sheet"""
        try:
            worksheet = self.get_worksheet(sheet_name)
            if worksheet:
                worksheet.delete_rows(row_number)
                return True
            return False
        except Exception as e:
            print(f"Error deleting row from {sheet_name}: {e}")
            return False
    
    def find_row_by_id(self, sheet_name, id_column, id_value):
        """Find a row by ID and return row number"""
        try:
            worksheet = self.get_worksheet(sheet_name)
            if worksheet:
                records = worksheet.get_all_records()
                for index, record in enumerate(records, 2):  # Start from 2 (accounting for header)
                    if str(record.get(id_column, '')) == str(id_value):
                        return index
            return None
        except Exception as e:
            print(f"Error finding row in {sheet_name}: {e}")
            return None
    
    def log_stock_movement(self, item_id, item_name, action_type, quantity_change, new_stock_level, reference_id="", notes=""):
        """Log a stock movement to the stock movements sheet"""
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            data = [timestamp, item_id, item_name, action_type, quantity_change, new_stock_level, reference_id, notes]
            return self.append_row(Config.STOCK_MOVEMENTS_SHEET, data)
        except Exception as e:
            print(f"Error logging stock movement: {e}")
            return False