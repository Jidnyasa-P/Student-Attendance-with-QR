#!/usr/bin/env python3
from flask import Flask, request, jsonify, render_template
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3, jwt, qrcode, io, base64, secrets, os, pytz
from datetime import datetime, timedelta

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['SECRET_KEY'] = 'qr-attendance-secret-2025'
DB_FILE = 'attendance.db'
IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    return datetime.now(IST).replace(tzinfo=None)

def init_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.executescript("""
        DROP TABLE IF EXISTS attendance;
        DROP TABLE IF EXISTS sessions;
        DROP TABLE IF EXISTS users;
        CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, user_type TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, faculty_id INTEGER NOT NULL, session_name TEXT NOT NULL, qr_data TEXT NOT NULL, session_token TEXT UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP NOT NULL, FOREIGN KEY (faculty_id) REFERENCES users(id));
        CREATE TABLE attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, session_id INTEGER NOT NULL, marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ip_address TEXT, photo LONGBLOB, FOREIGN KEY (student_id) REFERENCES users(id), FOREIGN KEY (session_id) REFERENCES sessions(id), UNIQUE(student_id, session_id));
        CREATE INDEX idx_session_token ON sessions(session_token);
        CREATE INDEX idx_attendance_session ON attendance(session_id);
    """)
    sample_pass = generate_password_hash('password123')
    cursor.executemany("INSERT INTO users (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)",
        [('student1', 'student1@test.com', sample_pass, 'student'), ('student2', 'student2@test.com', sample_pass, 'student'), ('student3', 'student3@test.com', sample_pass, 'student'), ('faculty1', 'faculty1@test.com', sample_pass, 'faculty'), ('admin', 'admin@test.com', sample_pass, 'faculty')])
    conn.commit()
    conn.close()
    print("✅ Database initialized")

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

if not os.path.exists(DB_FILE):
    init_database()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/student')
def student():
    return render_template('student.html')

@app.route('/faculty')
def faculty():
    return render_template('faculty.html')

@app.route('/api/test')
def test():
    return jsonify({'success': True, 'message': 'API Working!'})

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'})
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'message': 'Invalid credentials'})
        token = jwt.encode({'user_id': user['id'], 'username': user['username'], 'user_type': user['user_type'], 'exp': datetime.utcnow() + timedelta(hours=24)}, app.config['SECRET_KEY'], algorithm='HS256')
        print(f"✅ Login: {username}")
        return jsonify({'success': True, 'message': 'Login successful!', 'token': token, 'user': {'id': user['id'], 'username': user['username'], 'user_type': user['user_type']}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        user_type = data.get('user_type', '')
        if not all([username, email, password, user_type]):
            return jsonify({'success': False, 'message': 'All fields required'})
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
        if cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': 'User already exists'})
        password_hash = generate_password_hash(password)
        cursor.execute("INSERT INTO users (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)", (username, email, password_hash, user_type))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Registration successful!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/generate-qr', methods=['POST'])
def generate_qr():
    try:
        data = request.get_json()
        faculty_id = data.get('faculty_id')
        session_name = data.get('session_name', '').strip()
        if not faculty_id or not session_name:
            return jsonify({'success': False, 'message': 'Missing parameters'})
        session_token = secrets.token_urlsafe(32)
        timestamp = get_ist_now().isoformat()
        expires_at = get_ist_now() + timedelta(minutes=30)
        qr_data = f"ATTEND|{faculty_id}|{session_name}|{timestamp}|{session_token}"
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO sessions (faculty_id, session_name, qr_data, session_token, expires_at) VALUES (?, ?, ?, ?, ?)", (faculty_id, session_name, qr_data, session_token, expires_at.isoformat()))
        session_id = cursor.lastrowid
        conn.commit()
        conn.close()
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        print(f"✅ QR Generated: {session_name}")
        return jsonify({'success': True, 'session_id': session_id, 'qr_image': f"data:image/png;base64,{img_str}", 'session_name': session_name, 'qr_data': qr_data, 'expires_at': expires_at.isoformat()})
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/mark-attendance', methods=['POST'])
def mark_attendance():
    try:
        data = request.get_json()
        qr_data = data.get('qr_data', '')
        student_id = data.get('student_id')
        photo = data.get('photo')
        if not qr_data or not student_id:
            return jsonify({'success': False, 'message': 'Missing data'})
        if not qr_data.startswith('ATTEND|'):
            return jsonify({'success': False, 'message': 'Invalid QR'})
        try:
            parts = qr_data.split('|')
            if len(parts) != 5:
                return jsonify({'success': False, 'message': 'Invalid QR'})
            _, faculty_id, session_name, timestamp, session_token = parts
        except:
            return jsonify({'success': False, 'message': 'Parse error'})
        try:
            qr_time = datetime.fromisoformat(timestamp)
            time_diff = (get_ist_now() - qr_time).total_seconds()
            if time_diff > 1800:
                return jsonify({'success': False, 'message': 'QR expired'})
        except:
            return jsonify({'success': False, 'message': 'Time error'})
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM sessions WHERE session_token = ?", (session_token,))
        session = cursor.fetchone()
        if not session:
            conn.close()
            return jsonify({'success': False, 'message': 'Session not found'})
        session_id = session['id']
        cursor.execute("SELECT id FROM attendance WHERE student_id = ? AND session_id = ?", (student_id, session_id))
        if cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': 'Already marked'})
        photo_blob = None
        if photo:
            try:
                if ',' in photo:
                    photo = photo.split(',')[1]
                photo_blob = base64.b64decode(photo)
            except:
                pass
        marked_time = get_ist_now()
        cursor.execute("INSERT INTO attendance (student_id, session_id, ip_address, photo, marked_at) VALUES (?, ?, ?, ?, ?)", (student_id, session_id, request.remote_addr, photo_blob, marked_time.isoformat()))
        conn.commit()
        cursor.execute("SELECT username FROM users WHERE id = ?", (student_id,))
        student = cursor.fetchone()
        student_name = student['username'] if student else 'Student'
        conn.close()
        print(f"✅ Attendance marked: {student_name}")
        return jsonify({'success': True, 'message': f'Attendance marked for {session_name}!', 'session_name': session_name, 'student_name': student_name, 'marked_at': marked_time.isoformat()})
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/my-sessions', methods=['POST'])
def get_my_sessions():
    try:
        data = request.get_json()
        faculty_id = data.get('faculty_id')
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT s.id, s.session_name, s.created_at, COUNT(a.id) as attendance_count FROM sessions s LEFT JOIN attendance a ON s.id = a.session_id WHERE s.faculty_id = ? GROUP BY s.id ORDER BY s.created_at DESC LIMIT 20", (faculty_id,))
        sessions = [{'id': row['id'], 'session_name': row['session_name'], 'created_at': row['created_at'], 'attendance_count': row['attendance_count']} for row in cursor.fetchall()]
        conn.close()
        return jsonify({'success': True, 'sessions': sessions})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/attendance/<int:session_id>')
def get_attendance(session_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT a.id, a.marked_at, a.ip_address, a.photo, u.username, u.email FROM attendance a JOIN users u ON a.student_id = u.id WHERE a.session_id = ? ORDER BY a.marked_at DESC", (session_id,))
        records = []
        for row in cursor.fetchall():
            photo_base64 = None
            if row['photo']:
                try:
                    photo_base64 = base64.b64encode(row['photo']).decode('utf-8')
                except:
                    pass
            try:
                marked_time = datetime.fromisoformat(row['marked_at'])
                marked_time_ist = marked_time.strftime('%d-%m-%Y %H:%M:%S')
            except:
                marked_time_ist = row['marked_at']
            records.append({'id': row['id'], 'username': row['username'], 'email': row['email'], 'marked_at': marked_time_ist, 'ip_address': row['ip_address'] or 'N/A', 'photo': f"data:image/jpeg;base64,{photo_base64}" if photo_base64 else None})
        conn.close()
        return jsonify({'success': True, 'records': records})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

if __name__ == '__main__':
    print("="*70)
    print("🚀 QR ATTENDANCE SYSTEM - FULLY WORKING")
    print("="*70)
    print("\n✅ URL: http://localhost:5000")
    print("👤 Student: student1 / password123")
    print("👨‍🏫 Faculty: faculty1 / password123\n")
    print("="*70)
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
