from datetime import datetime
import uuid
from config.settings import Config

class InventoryManager:
    def __init__(self, sheets_manager):
        self.sheets = sheets_manager
        self.sheet_name = Config.INVENTORY_SHEET
    
    def generate_item_id(self):
        """Generate a unique item ID"""
        return f"ITM-{str(uuid.uuid4())[:8].upper()}"
    
    def add_item(self, item_data):
        """Add a new inventory item"""
        try:
            item_id = self.generate_item_id()
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Prepare data for insertion
            data = [
                item_id,
                item_data.get('name', ''),
                item_data.get('category', ''),
                float(item_data.get('current_stock', 0)),
                item_data.get('unit', ''),
                float(item_data.get('cost_per_unit', 0)),
                float(item_data.get('reorder_level', 0)),
                item_data.get('supplier', ''),
                current_time
            ]
            
            success = self.sheets.append_row(self.sheet_name, data)
            if success:
                # Log stock movement
                self.sheets.log_stock_movement(
                    item_id, 
                    item_data.get('name', ''),
                    'Initial Stock',
                    float(item_data.get('current_stock', 0)),
                    float(item_data.get('current_stock', 0)),
                    notes="Item added to inventory"
                )
                return item_id
            return None
        except Exception as e:
            print(f"Error adding item: {e}")
            return None
    
    def get_all_items(self):
        """Get all inventory items"""
        try:
            return self.sheets.get_all_records(self.sheet_name)
        except Exception as e:
            print(f"Error getting all items: {e}")
            return []
    
    def get_item_by_id(self, item_id):
        """Get a specific item by ID"""
        try:
            records = self.get_all_items()
            for record in records:
                if record.get('Item ID') == item_id:
                    return record
            return None
        except Exception as e:
            print(f"Error getting item by ID: {e}")
            return None
    
    def update_item(self, item_id, update_data):
        """Update an existing inventory item"""
        try:
            row_number = self.sheets.find_row_by_id(self.sheet_name, 'Item ID', item_id)
            if not row_number:
                return False
            
            # Get current item data
            current_item = self.get_item_by_id(item_id)
            if not current_item:
                return False
            
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Prepare updated data
            updated_data = {
                'Item ID': item_id,
                'Name': update_data.get('name', current_item.get('Name', '')),
                'Category': update_data.get('category', current_item.get('Category', '')),
                'Current Stock': float(update_data.get('current_stock', current_item.get('Current Stock', 0))),
                'Unit': update_data.get('unit', current_item.get('Unit', '')),
                'Cost Per Unit': float(update_data.get('cost_per_unit', current_item.get('Cost Per Unit', 0))),
                'Reorder Level': float(update_data.get('reorder_level', current_item.get('Reorder Level', 0))),
                'Supplier': update_data.get('supplier', current_item.get('Supplier', '')),
                'Last Updated': current_time
            }
            
            success = self.sheets.update_row(self.sheet_name, row_number, updated_data)
            
            # Log stock movement if stock changed
            if 'current_stock' in update_data:
                old_stock = float(current_item.get('Current Stock', 0))
                new_stock = float(update_data['current_stock'])
                if old_stock != new_stock:
                    quantity_change = new_stock - old_stock
                    self.sheets.log_stock_movement(
                        item_id,
                        updated_data['Name'],
                        'Manual Adjustment',
                        quantity_change,
                        new_stock,
                        notes="Stock manually updated"
                    )
            
            return success
        except Exception as e:
            print(f"Error updating item: {e}")
            return False
    
    def delete_item(self, item_id):
        """Delete an inventory item"""
        try:
            row_number = self.sheets.find_row_by_id(self.sheet_name, 'Item ID', item_id)
            if not row_number:
                return False
            
            # Get item data before deletion for logging
            item = self.get_item_by_id(item_id)
            if item:
                self.sheets.log_stock_movement(
                    item_id,
                    item.get('Name', ''),
                    'Item Deleted',
                    -float(item.get('Current Stock', 0)),
                    0,
                    notes="Item removed from inventory"
                )
            
            return self.sheets.delete_row(self.sheet_name, row_number)
        except Exception as e:
            print(f"Error deleting item: {e}")
            return False
    
    def update_stock(self, item_id, quantity_change, action_type, reference_id="", notes=""):
        """Update stock level for an item"""
        try:
            item = self.get_item_by_id(item_id)
            if not item:
                return False
            
            current_stock = float(item.get('Current Stock', 0))
            new_stock = current_stock + quantity_change
            
            if new_stock < 0:
                new_stock = 0  # Don't allow negative stock
            
            # Update the item
            success = self.update_item(item_id, {'current_stock': new_stock})
            
            if success:
                # Log stock movement
                self.sheets.log_stock_movement(
                    item_id,
                    item.get('Name', ''),
                    action_type,
                    quantity_change,
                    new_stock,
                    reference_id,
                    notes
                )
            
            return success
        except Exception as e:
            print(f"Error updating stock: {e}")
            return False
    
    def get_low_stock_items(self):
        """Get items that are below their reorder level"""
        try:
            items = self.get_all_items()
            low_stock_items = []
            
            for item in items:
                current_stock = float(item.get('Current Stock', 0))
                reorder_level = float(item.get('Reorder Level', 0))
                
                if current_stock <= reorder_level:
                    low_stock_items.append(item)
            
            return low_stock_items
        except Exception as e:
            print(f"Error getting low stock items: {e}")
            return []
    
    def search_items(self, search_term, category=None):
        """Search items by name or category"""
        try:
            items = self.get_all_items()
            filtered_items = []
            
            for item in items:
                name_match = search_term.lower() in item.get('Name', '').lower()
                category_match = category is None or item.get('Category', '') == category
                
                if name_match and category_match:
                    filtered_items.append(item)
            
            return filtered_items
        except Exception as e:
            print(f"Error searching items: {e}")
            return []
    
    def get_categories(self):
        """Get all unique categories"""
        try:
            items = self.get_all_items()
            categories = list(set(item.get('Category', '') for item in items))
            return [cat for cat in categories if cat]  # Remove empty categories
        except Exception as e:
            print(f"Error getting categories: {e}")
            return []