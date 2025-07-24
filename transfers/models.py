from datetime import datetime
import uuid
from config.settings import Config

class TransferManager:
    def __init__(self, sheets_manager):
        self.sheets = sheets_manager
        self.sheet_name = Config.TRANSFERS_SHEET
    
    def generate_transfer_id(self):
        """Generate a unique transfer ID"""
        return f"TRF-{str(uuid.uuid4())[:8].upper()}"
    
    def add_transfer(self, transfer_data):
        """Add a new transfer"""
        try:
            transfer_id = self.generate_transfer_id()
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Prepare data for insertion
            data = [
                transfer_id,
                transfer_data.get('date', current_time),
                transfer_data.get('from_location', ''),
                transfer_data.get('to_location', ''),
                transfer_data.get('item_id', ''),
                transfer_data.get('item_name', ''),
                float(transfer_data.get('quantity', 0)),
                transfer_data.get('status', 'Pending'),
                transfer_data.get('notes', '')
            ]
            
            success = self.sheets.append_row(self.sheet_name, data)
            if success:
                return transfer_id
            return None
        except Exception as e:
            print(f"Error adding transfer: {e}")
            return None
    
    def get_all_transfers(self):
        """Get all transfers"""
        try:
            return self.sheets.get_all_records(self.sheet_name)
        except Exception as e:
            print(f"Error getting all transfers: {e}")
            return []
    
    def get_transfer_by_id(self, transfer_id):
        """Get a specific transfer by ID"""
        try:
            records = self.get_all_transfers()
            for record in records:
                if record.get('Transfer ID') == transfer_id:
                    return record
            return None
        except Exception as e:
            print(f"Error getting transfer by ID: {e}")
            return None
    
    def update_transfer_status(self, transfer_id, status):
        """Update transfer status"""
        try:
            row_number = self.sheets.find_row_by_id(self.sheet_name, 'Transfer ID', transfer_id)
            if not row_number:
                return False
            
            # Get current transfer data
            current_transfer = self.get_transfer_by_id(transfer_id)
            if not current_transfer:
                return False
            
            # Prepare updated data
            updated_data = {
                'Transfer ID': transfer_id,
                'Date': current_transfer.get('Date', ''),
                'From Location': current_transfer.get('From Location', ''),
                'To Location': current_transfer.get('To Location', ''),
                'Item ID': current_transfer.get('Item ID', ''),
                'Item Name': current_transfer.get('Item Name', ''),
                'Quantity': current_transfer.get('Quantity', 0),
                'Status': status,
                'Notes': current_transfer.get('Notes', '')
            }
            
            return self.sheets.update_row(self.sheet_name, row_number, updated_data)
        except Exception as e:
            print(f"Error updating transfer status: {e}")
            return False
    
    def complete_transfer(self, transfer_id):
        """Complete a transfer and update inventory levels"""
        try:
            from inventory.models import InventoryManager
            inventory_manager = InventoryManager(self.sheets)
            
            transfer = self.get_transfer_by_id(transfer_id)
            if not transfer:
                return False
            
            item_id = transfer.get('Item ID')
            quantity = float(transfer.get('Quantity', 0))
            from_location = transfer.get('From Location', '')
            to_location = transfer.get('To Location', '')
            
            if item_id and quantity > 0:
                # Note: In a more complex system, you'd have location-specific inventory
                # For now, we'll just log the transfer movement
                inventory_manager.sheets.log_stock_movement(
                    item_id,
                    transfer.get('Item Name', ''),
                    'Transfer',
                    0,  # No net stock change in simple system
                    inventory_manager.get_item_by_id(item_id).get('Current Stock', 0),
                    transfer_id,
                    f"Transferred {quantity} from {from_location} to {to_location}"
                )
                
                # Update transfer status
                return self.update_transfer_status(transfer_id, 'Completed')
            
            return False
        except Exception as e:
            print(f"Error completing transfer: {e}")
            return False
    
    def get_transfers_by_status(self, status):
        """Get transfers filtered by status"""
        try:
            transfers = self.get_all_transfers()
            return [t for t in transfers if t.get('Status') == status]
        except Exception as e:
            print(f"Error getting transfers by status: {e}")
            return []
    
    def get_transfers_by_location(self, location, location_type='from'):
        """Get transfers filtered by location (from or to)"""
        try:
            transfers = self.get_all_transfers()
            location_field = 'From Location' if location_type == 'from' else 'To Location'
            return [t for t in transfers if t.get(location_field) == location]
        except Exception as e:
            print(f"Error getting transfers by location: {e}")
            return []