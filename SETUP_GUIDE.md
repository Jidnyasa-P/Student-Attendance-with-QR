# 🔧 Setup Guide - Complete Instructions

## Prerequisites

- Python 3.8+
- Modern browser (Chrome recommended)

## Step-by-Step Setup

### Step 1: Extract Files
Extract ZIP to: `C:\qr_attendance\` (or your preferred location)

### Step 2: Open Terminal
```bash
cd C:\qr_attendance\QR_Attendance_Working
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

This installs:
- Flask 2.3.3
- PyJWT 2.8.0
- qrcode 7.4.2
- Pillow 10.0.1
- Werkzeug 2.3.7

### Step 4: Run Server
```bash
python app.py
```

You should see:
```
======================================================================
🚀 QR ATTENDANCE SYSTEM - FULLY WORKING VERSION
======================================================================

✅ Features:
   • Faculty: Generate QR codes
   • Students: Scan QR & mark attendance
   • Real-time attendance tracking
   • SQLite3 database (auto-created)

🌐 Access:
   • URL: http://localhost:5000
   • API Test: http://localhost:5000/api/test

👤 Test Accounts (password: password123):
   • Students: student1, student2, student3
   • Faculty: faculty1, admin

======================================================================
```

### Step 5: Test in Browser
Open http://localhost:5000

## Complete Test Workflow

### Test 1: Faculty QR Generation

1. Open http://localhost:5000
2. Login: `faculty1` / `password123`
3. Enter session: "Test Session"
4. Click "Generate QR Code"
5. **✅ QR code should appear**

### Test 2: Student Attendance

1. Open new tab: http://localhost:5000
2. Login: `student1` / `password123`
3. Click "Test QR" button
4. Click "Mark My Attendance"
5. **✅ Success message should appear**

### Test 3: Verify Database

1. Back to faculty tab
2. Select "Test Session" from dropdown
3. **✅ Should see student1 in attendance list**

## Troubleshooting

### Problem: Module not found
```bash
python -m pip install --upgrade pip
pip install Flask PyJWT qrcode Pillow Werkzeug
```

### Problem: Port already in use
```bash
# Kill process on port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <number> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

### Problem: Camera not working
- Use "Test QR" button (no camera needed)
- Grant camera permissions in browser
- Use Chrome or Firefox

### Problem: Attendance not saving
- Check browser console (F12)
- Verify you're logged in
- Check QR hasn't expired (30 min)
- Look at terminal output for errors

## Database Location

SQLite database is created at:
- `QR_Attendance_Working/attendance.db`

To reset:
```bash
rm attendance.db
python app.py  # Auto-recreates with test users
```

## Production Deployment

### With Gunicorn:
```bash
pip install gunicorn
gunicorn app:app --bind 0.0.0.0:5000 --workers 4
```

### With Docker:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

## Success Indicators

✅ Server starts without errors
✅ Can access http://localhost:5000
✅ Can login with test accounts
✅ QR code generates and displays
✅ Can mark attendance
✅ Attendance appears in faculty view

## Support

If issues persist:
1. Check terminal output for errors
2. Check browser console (F12)
3. Verify Python 3.8+ installed
4. Try different browser
5. Delete attendance.db and restart

**Everything should work!** If not, check console logs.
