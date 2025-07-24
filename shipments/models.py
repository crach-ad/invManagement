from datetime import datetime
import uuid
from config.settings import Config

class ShipmentManager:
    def __init__(self, sheets_manager):
        self.sheets = sheets_manager
        self.sheet_name = Config.SHIPMENTS_SHEET
    
    def generate_shipment_id(self):
        """Generate a unique shipment ID"""
        return f"SHP-{str(uuid.uuid4())[:8].upper()}"
    
    def add_shipment(self, shipment_data):
        """Add a new shipment"""
        try:
            shipment_id = self.generate_shipment_id()
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Prepare data for insertion
            data = [
                shipment_id,
                shipment_data.get('date', current_time),
                shipment_data.get('supplier', ''),
                shipment_data.get('status', 'Pending'),
                int(shipment_data.get('total_items', 0)),
                float(shipment_data.get('total_cost', 0)),
                shipment_data.get('received_by', ''),
                shipment_data.get('notes', '')
            ]
            
            success = self.sheets.append_row(self.sheet_name, data)
            if success:
                return shipment_id
            return None
        except Exception as e:
            print(f"Error adding shipment: {e}")
            return None
    
    def get_all_shipments(self):
        """Get all shipments"""
        try:
            return self.sheets.get_all_records(self.sheet_name)
        except Exception as e:
            print(f"Error getting all shipments: {e}")
            return []
    
    def get_shipment_by_id(self, shipment_id):
        """Get a specific shipment by ID"""
        try:
            records = self.get_all_shipments()
            for record in records:
                if record.get('Shipment ID') == shipment_id:
                    return record
            return None
        except Exception as e:
            print(f"Error getting shipment by ID: {e}")
            return None
    
    def update_shipment_status(self, shipment_id, status, received_by=None):
        """Update shipment status"""
        try:
            row_number = self.sheets.find_row_by_id(self.sheet_name, 'Shipment ID', shipment_id)
            if not row_number:
                return False
            
            # Get current shipment data
            current_shipment = self.get_shipment_by_id(shipment_id)
            if not current_shipment:
                return False
            
            # Prepare updated data
            updated_data = {
                'Shipment ID': shipment_id,
                'Date': current_shipment.get('Date', ''),
                'Supplier': current_shipment.get('Supplier', ''),
                'Status': status,
                'Total Items': current_shipment.get('Total Items', 0),
                'Total Cost': current_shipment.get('Total Cost', 0),
                'Received By': received_by or current_shipment.get('Received By', ''),
                'Notes': current_shipment.get('Notes', '')
            }
            
            return self.sheets.update_row(self.sheet_name, row_number, updated_data)
        except Exception as e:
            print(f"Error updating shipment status: {e}")
            return False
    
    def receive_shipment(self, shipment_id, items_received, received_by):
        """Mark shipment as received and update inventory"""
        try:
            from inventory.models import InventoryManager
            inventory_manager = InventoryManager(self.sheets)
            
            # Update shipment status
            success = self.update_shipment_status(shipment_id, 'Received', received_by)
            if not success:
                return False
            
            # Update inventory for each item received
            for item in items_received:
                item_id = item.get('item_id')
                quantity = float(item.get('quantity', 0))
                
                if item_id and quantity > 0:
                    inventory_manager.update_stock(
                        item_id,
                        quantity,
                        'Shipment Received',
                        shipment_id,
                        f"Received from supplier via shipment {shipment_id}"
                    )
            
            return True
        except Exception as e:
            print(f"Error receiving shipment: {e}")
            return False
    
    def get_shipments_by_status(self, status):
        """Get shipments filtered by status"""
        try:
            shipments = self.get_all_shipments()
            return [s for s in shipments if s.get('Status') == status]
        except Exception as e:
            print(f"Error getting shipments by status: {e}")
            return []
    
    def get_shipments_by_supplier(self, supplier):
        """Get shipments filtered by supplier"""
        try:
            shipments = self.get_all_shipments()
            return [s for s in shipments if s.get('Supplier') == supplier]
        except Exception as e:
            print(f"Error getting shipments by supplier: {e}")
            return []