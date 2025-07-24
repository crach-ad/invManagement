from datetime import datetime
from config.settings import Config

class AuthManager:
    def __init__(self, sheets_manager):
        self.sheets_manager = sheets_manager
        self.users_sheet = Config.USERS_SHEET
    
    def validate_user(self, username, password):
        """Validate user credentials against Google Sheets"""
        try:
            worksheet = self.sheets_manager.get_worksheet(self.users_sheet)
            if not worksheet:
                return None
            
            # Get all users data
            users_data = worksheet.get_all_records()
            
            # Find user with matching username and password
            for user in users_data:
                if (user.get('Username', '').lower() == username.lower() and 
                    user.get('Password', '') == password and 
                    user.get('Active', '').upper() == 'TRUE'):
                    
                    # Update last login
                    self.update_last_login(username)
                    
                    return {
                        'username': user.get('Username'),
                        'role': user.get('Role', 'staff'),
                        'active': user.get('Active', 'TRUE')
                    }
            
            return None
        except Exception as e:
            print(f"Error validating user: {e}")
            return None
    
    def update_last_login(self, username):
        """Update the last login timestamp for a user"""
        try:
            worksheet = self.sheets_manager.get_worksheet(self.users_sheet)
            if not worksheet:
                return False
            
            # Get all data including headers
            all_data = worksheet.get_all_values()
            if not all_data:
                return False
            
            headers = all_data[0]
            
            # Find username and last login columns
            username_col = None
            last_login_col = None
            
            for i, header in enumerate(headers):
                if header.lower() == 'username':
                    username_col = i + 1  # gspread uses 1-based indexing
                elif header.lower() == 'last login':
                    last_login_col = i + 1
            
            if username_col is None or last_login_col is None:
                return False
            
            # Find the user row
            for row_idx, row_data in enumerate(all_data[1:], start=2):  # Start from row 2 (skip header)
                if username_col <= len(row_data) and row_data[username_col-1].lower() == username.lower():
                    # Update last login
                    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    worksheet.update_cell(row_idx, last_login_col, current_time)
                    return True
            
            return False
        except Exception as e:
            print(f"Error updating last login: {e}")
            return False
    
    def get_user_by_username(self, username):
        """Get user information by username"""
        try:
            worksheet = self.sheets_manager.get_worksheet(self.users_sheet)
            if not worksheet:
                return None
            
            users_data = worksheet.get_all_records()
            
            for user in users_data:
                if user.get('Username', '').lower() == username.lower():
                    return {
                        'username': user.get('Username'),
                        'role': user.get('Role', 'staff'),
                        'active': user.get('Active', 'TRUE'),
                        'last_login': user.get('Last Login', ''),
                        'created_date': user.get('Created Date', '')
                    }
            
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def create_default_admin(self):
        """Create a default admin user if no users exist"""
        try:
            worksheet = self.sheets_manager.get_worksheet(self.users_sheet)
            if not worksheet:
                print("Users sheet not found. Please ensure Google Sheets is properly configured.")
                return False
            
            # Check if any users exist (handle empty sheet)
            try:
                users_data = worksheet.get_all_records()
                if users_data:
                    print("Users already exist in the system.")
                    return True  # Users already exist
            except Exception:
                # Sheet might be empty or have no data, that's okay
                pass
            
            # Check if sheet has any data at all
            all_values = worksheet.get_all_values()
            if len(all_values) > 1:  # More than just headers
                print("Users sheet has data, skipping default admin creation.")
                return True
            
            # Create default admin user
            admin_data = [
                'admin',           # Username
                'admin123',        # Password (should be changed immediately)
                'admin',           # Role
                'TRUE',            # Active
                '',                # Last Login (empty initially)
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')  # Created Date
            ]
            
            worksheet.append_row(admin_data)
            print("✅ Default admin user created successfully!")
            print("📋 Login Details:")
            print("   Username: admin")
            print("   Password: admin123")
            print("⚠️  IMPORTANT: Please change the default password after first login!")
            return True
            
        except Exception as e:
            print(f"Error creating default admin: {e}")
            return False