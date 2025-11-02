// QR Attendance System - Working Version
const API_URL = '/api';
let currentUser = null;

// Utility functions
function showAlert(message, type = 'info', duration = 5000) {
    const alertsDiv = document.getElementById('alerts');
    if (!alertsDiv) return;

    const alertId = 'alert-' + Date.now();
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        <i class="fas fa-${getIcon(type)}"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertsDiv.appendChild(alert);
    setTimeout(() => document.getElementById(alertId)?.remove(), duration);
}

function getIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function saveUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function getUser() {
    if (currentUser) return currentUser;
    const stored = localStorage.getItem('currentUser');
    currentUser = stored ? JSON.parse(stored) : null;
    return currentUser;
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {'Content-Type': 'application/json'},
            ...options
        });
        const data = await response.json();
        console.log('API Response:', endpoint, data);
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showAlert('Network error. Check if server is running on http://localhost:5000', 'danger');
        return null;
    }
}

// Authentication
async function loginUser(username, password) {
    const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({username, password})
    });

    if (data && data.success) {
        saveUser(data.user);
        showAlert('✅ Login successful! Redirecting...', 'success', 2000);
        setTimeout(() => {
            window.location.href = data.user.user_type === 'student' ? '/student' : '/faculty';
        }, 1500);
        return true;
    } else {
        showAlert(data?.message || '❌ Login failed', 'danger');
        return false;
    }
}

async function registerUser(username, email, password, userType) {
    const data = await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({username, email, password, user_type: userType})
    });

    if (data && data.success) {
        showAlert('✅ Registration successful! You can now login.', 'success');
        showLogin();
        return true;
    } else {
        showAlert(data?.message || '❌ Registration failed', 'danger');
        return false;
    }
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Page initialization
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    console.log('Current path:', path);

    if (path === '/') {
        initLogin();
    } else if (path === '/student') {
        initStudent();
    } else if (path === '/faculty') {
        initFaculty();
    }
});

function initLogin() {
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            if (username && password) {
                await loginUser(username, password);
            }
        });
    }

    const registerForm = document.getElementById('registerFormElement');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const userType = document.getElementById('regUserType').value;

            if (username && email && password && userType) {
                await registerUser(username, email, password, userType);
            } else {
                showAlert('Please fill all fields', 'warning');
            }
        });
    }
}

function initStudent() {
    const user = getUser();
    if (!user || user.user_type !== 'student') {
        logout();
        return;
    }
    document.getElementById('username').textContent = user.username;
    if (typeof initQRScanner === 'function') {
        initQRScanner();
    }
    showAlert(`Welcome, ${user.username}! 👋`, 'info', 3000);
}

function initFaculty() {
    const user = getUser();
    if (!user || user.user_type !== 'faculty') {
        logout();
        return;
    }
    document.getElementById('username').textContent = user.username;
    initFacultyDashboard();
    loadRecentSessions();
    showAlert(`Welcome, Professor ${user.username}! 👨‍🏫`, 'info', 3000);
}

// Export functions
window.apiRequest = apiRequest;
window.getUser = getUser;
window.showAlert = showAlert;
window.logout = logout;
window.showLogin = showLogin;
window.showRegister = showRegister;
