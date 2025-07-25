from flask import Flask
import sys
import os

app = Flask(__name__)

@app.route('/')
def hello():
    return """
    <h1>🎉 Vercel Function Working!</h1>
    <p><strong>Python Version:</strong> {}</p>
    <p><strong>Environment Variables:</strong></p>
    <ul>
        <li>SECRET_KEY: {}</li>
        <li>SPREADSHEET_ID: {}</li>
        <li>GOOGLE_CREDENTIALS_JSON: {}</li>
    </ul>
    <p><strong>System Path:</strong> {}</p>
    """.format(
        sys.version,
        "✅ Set" if os.getenv('SECRET_KEY') else "❌ Missing",
        "✅ Set" if os.getenv('SPREADSHEET_ID') else "❌ Missing", 
        "✅ Set" if os.getenv('GOOGLE_CREDENTIALS_JSON') else "❌ Missing",
        "<br>".join(sys.path[:5])  # Show first 5 paths
    )

@app.route('/test')
def test():
    try:
        # Test imports one by one
        import json
        import datetime
        from dotenv import load_dotenv
        
        results = []
        results.append("✅ Basic imports working")
        
        # Test environment variables
        load_dotenv()
        results.append("✅ dotenv loaded")
        
        # Test if we can access parent directory
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        results.append("✅ Path modification successful")
        
        # Test our config import
        try:
            from config.settings import Config
            results.append("✅ Config import successful")
        except Exception as e:
            results.append(f"❌ Config import failed: {str(e)}")
        
        # Test Google Sheets imports
        try:
            import gspread
            from google.oauth2.service_account import Credentials
            results.append("✅ Google APIs imported")
        except Exception as e:
            results.append(f"❌ Google APIs import failed: {str(e)}")
        
        return "<h1>Import Test Results</h1><ul>" + "".join([f"<li>{r}</li>" for r in results]) + "</ul>"
        
    except Exception as e:
        return f"<h1>❌ Test Failed</h1><p>{str(e)}</p>"

# This is the WSGI app that Vercel will use