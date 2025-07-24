# Vercel Deployment Guide

## Prerequisites
- Vercel account (vercel.com)
- GitHub repository with the code
- Google Sheets API credentials

## Environment Variables Setup

In your Vercel dashboard, you need to set these environment variables:

### Required Environment Variables:

1. **GOOGLE_CREDENTIALS_JSON**
   - Copy the entire contents of your `credentials.json` file
   - Paste it as a single line JSON string (remove line breaks)
   - This should be the complete service account JSON from Google Cloud Console

2. **SPREADSHEET_ID**
   ```
   1w4sPHyFy3Hjj9VYkQSQjsCJIFfqpCLz47jaN-G-M2is
   ```

3. **SECRET_KEY**
   ```
   restaurant-inventory-secret-key-2024
   ```

4. **DEBUG** (optional)
   ```
   False
   ```

## Deployment Steps

1. **Connect GitHub Repository**
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   - In the Vercel project settings
   - Go to "Environment Variables"
   - Add all the variables listed above

3. **Deploy**
   - Vercel will automatically deploy when you push to GitHub
   - The app will be available at your Vercel URL

## Important Notes

- The `vercel.json` file configures Vercel to use the `api/index.py` as the entry point
- All routes are routed through the serverless function
- Environment variables are used instead of the `credentials.json` file for security
- The Google Sheets credentials are stored as a JSON string in environment variables

## Troubleshooting

If you get errors:
1. Check that all environment variables are set correctly
2. Ensure the Google Sheets API is enabled in Google Cloud Console
3. Verify the service account has access to your spreadsheet
4. Check Vercel function logs for detailed error messages

## Login Credentials

- Username: `admin`
- Password: `admin123`

Change these by editing the Users sheet in Google Sheets after first login.