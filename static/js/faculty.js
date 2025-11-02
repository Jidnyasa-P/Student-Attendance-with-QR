// Faculty Dashboard - COMPLETE WORKING VERSION WITH REAL-TIME UPDATES

function initFacultyDashboard() {
    console.log('📊 Initializing faculty dashboard...');
    
    const form = document.getElementById('generateQRForm');
    if (form) form.addEventListener('submit', generateQRCode);
    
    const select = document.getElementById('sessionSelect');
    if (select) select.addEventListener('change', loadAttendanceDetails);
    
    // Auto-refresh every 5 seconds for real-time updates
    setInterval(() => {
        const sessionId = document.getElementById('sessionSelect')?.value;
        if (sessionId && document.visibilityState === 'visible') {
            loadAttendanceDetails(true);
        }
    }, 5000);
    
    console.log('✅ Faculty dashboard ready');
}

async function generateQRCode(e) {
    e.preventDefault();
    
    const sessionName = document.getElementById('sessionName').value.trim();
    if (!sessionName) {
        window.showAlert('⚠️ Please enter session name', 'warning');
        return;
    }
    
    const user = window.getUser();
    if (!user) {
        window.showAlert('❌ Not logged in', 'danger');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    
    try {
        const result = await window.apiRequest('/generate-qr', {
            method: 'POST',
            body: JSON.stringify({
                faculty_id: user.id,
                session_name: sessionName
            })
        });
        
        if (result && result.success) {
            document.getElementById('qrImage').src = result.qr_image;
            document.getElementById('displaySessionName').textContent = result.session_name;
            document.getElementById('qrDisplay').style.display = 'block';
            document.getElementById('sessionName').value = '';
            
            window.showAlert(`✅ QR Generated for "${sessionName}"!`, 'success', 2000);
            console.log('✅ QR generated successfully');
            
            loadRecentSessions();
        } else {
            window.showAlert(result?.message || '❌ Failed to generate QR', 'danger');
        }
    } catch (error) {
        window.showAlert('❌ Network error', 'danger');
        console.error('Error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function loadRecentSessions() {
    const user = window.getUser();
    if (!user) return;
    
    console.log('📋 Loading sessions...');
    
    try {
        const result = await window.apiRequest('/my-sessions', {
            method: 'POST',
            body: JSON.stringify({ faculty_id: user.id })
        });
        
        if (result && result.success) {
            displaySessionsList(result.sessions);
            updateSessionSelect(result.sessions);
            updateQuickStats(result.sessions);
            console.log(`✅ Loaded ${result.sessions.length} sessions`);
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

function displaySessionsList(sessions) {
    const list = document.getElementById('sessionsList');
    if (!list) return;
    
    if (!sessions || sessions.length === 0) {
        list.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-calendar-plus fa-3x mb-3"></i>
                <p>No sessions created yet</p>
            </div>
        `;
        return;
    }
    
    const html = sessions.map(s => `
        <div class="session-item mb-2 p-3 bg-light rounded">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong><i class="fas fa-graduation-cap"></i> ${s.session_name}</strong><br>
                    <small class="text-muted">
                        <i class="fas fa-clock"></i> ${new Date(s.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </small>
                </div>
                <span class="badge bg-success fs-6">
                    <i class="fas fa-users"></i> ${s.attendance_count}
                </span>
            </div>
        </div>
    `).join('');
    
    list.innerHTML = html;
}

function updateSessionSelect(sessions) {
    const select = document.getElementById('sessionSelect');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select a session...</option>';
    
    sessions.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.session_name} (${s.attendance_count})`;
        select.appendChild(option);
    });
    
    if (currentValue) select.value = currentValue;
}

function updateQuickStats(sessions) {
    const total = sessions.length;
    const totalAtt = sessions.reduce((sum, s) => sum + s.attendance_count, 0);
    
    if (document.getElementById('totalSessions')) document.getElementById('totalSessions').textContent = total;
    if (document.getElementById('totalAttendance')) document.getElementById('totalAttendance').textContent = totalAtt;
}

async function loadAttendanceDetails(silent = false) {
    const select = document.getElementById('sessionSelect');
    const details = document.getElementById('attendanceDetails');
    
    if (!select || !details) return;
    
    const sessionId = select.value;
    
    if (!sessionId) {
        details.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-user-check fa-3x mb-3"></i>
                <p>Select a session to view attendance</p>
            </div>
        `;
        return;
    }
    
    if (!silent) {
        details.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Loading attendance...</p>
            </div>
        `;
    }
    
    try {
        const result = await window.apiRequest(`/attendance/${sessionId}`);
        
        if (result && result.success) {
            displayAttendanceTable(result.records);
            if (!silent) {
                console.log(`✅ Loaded ${result.records.length} attendance records`);
            }
        } else {
            details.innerHTML = `<div class="alert alert-warning">Failed to load attendance</div>`;
        }
    } catch (error) {
        details.innerHTML = `<div class="alert alert-danger">Network error</div>`;
    }
}

function displayAttendanceTable(records) {
    const details = document.getElementById('attendanceDetails');
    if (!details) return;
    
    if (!records || records.length === 0) {
        details.innerHTML = `<div class="alert alert-info">No attendance records yet</div>`;
        return;
    }
    
    const html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-light">
                    <tr>
                        <th style="width: 80px;"><i class="fas fa-image"></i> Photo</th>
                        <th><i class="fas fa-user"></i> Name</th>
                        <th><i class="fas fa-envelope"></i> Email</th>
                        <th><i class="fas fa-clock"></i> Time (IST)</th>
                        <th><i class="fas fa-map-marker-alt"></i> IP</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td>
                                ${r.photo ? `
                                    <img src="${r.photo}" class="rounded" style="width: 60px; height: 60px; object-fit: cover; cursor: pointer;" 
                                         data-bs-toggle="modal" data-bs-target="#photoModal" onclick="showPhotoModal('${r.photo}', '${r.username}')">
                                ` : `
                                    <span class="badge bg-secondary">No Photo</span>
                                `}
                            </td>
                            <td><strong>${r.username}</strong></td>
                            <td>${r.email}</td>
                            <td><small>${r.marked_at}</small></td>
                            <td><small class="text-muted">${r.ip_address}</small></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="alert alert-success mt-3">
            <i class="fas fa-check-circle"></i> 
            <strong>Total: ${records.length}</strong> student${records.length !== 1 ? 's' : ''} 
            (${records.filter(r => r.photo).length} with photos)
        </div>
    `;
    
    details.innerHTML = html;
}

function showPhotoModal(photoSrc, studentName) {
    const modalId = `photoModal-${Date.now()}`;
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = modalId;
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-user"></i> ${studentName}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <img src="${photoSrc}" class="img-fluid rounded" style="max-height: 400px;">
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => modal.remove());
}

function refreshAttendance() {
    loadAttendanceDetails();
    window.showAlert('🔄 Refreshing...', 'info', 1500);
}

function printQR() {
    const img = document.getElementById('qrImage');
    const sessionName = document.getElementById('displaySessionName').textContent;
    
    if (!img || !img.src) return;
    
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <title>QR - ${sessionName}</title>
            <style>
                body { text-align: center; font-family: Arial; padding: 2rem; }
                h1 { color: #333; }
                img { max-width: 500px; border: 3px solid #000; padding: 20px; }
            </style>
        </head>
        <body>
            <h1>📊 Attendance QR Code</h1>
            <h2>${sessionName}</h2>
            <img src="${img.src}">
            <p><small>Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</small></p>
        </body>
        </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

function downloadQR() {
    const img = document.getElementById('qrImage');
    const sessionName = document.getElementById('displaySessionName').textContent;
    
    if (!img || !img.src) return;
    
    const link = document.createElement('a');
    link.download = `QR_${sessionName.replace(/[^a-z0-9]/gi, '_')}.png`;
    link.href = img.src;
    link.click();
    
    window.showAlert('✅ Downloaded!', 'success', 1500);
}

// Export functions
window.initFacultyDashboard = initFacultyDashboard;
window.loadRecentSessions = loadRecentSessions;
window.refreshAttendance = refreshAttendance;
window.printQR = printQR;
window.downloadQR = downloadQR;
window.showPhotoModal = showPhotoModal;

console.log('✅ Faculty dashboard loaded');
