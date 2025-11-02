// QR Scanner with Photo Capture - FIXED VERSION

class QRCodeScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.isScanning = false;
        this.stream = null;
        this.lastQRData = null;
        this.scanInterval = null;
        this.capturedPhoto = null;
        this.initEventListeners();
        console.log('✅ QR Scanner initialized');
    }

    initEventListeners() {
        document.getElementById('startScanBtn')?.addEventListener('click', () => this.startScanning());
        document.getElementById('stopScanBtn')?.addEventListener('click', () => this.stopScanning());
        document.getElementById('testQRBtn')?.addEventListener('click', () => this.testQR());
        document.getElementById('markAttendanceBtn')?.addEventListener('click', () => this.showPhotoModal());
    }

    async startScanning() {
        try {
            console.log('📷 Requesting camera access...');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {ideal: 'environment'},
                    width: {ideal: 1280},
                    height: {ideal: 720}
                }
            });
            this.video.srcObject = this.stream;
            await this.video.play();
            this.isScanning = true;
            this.video.classList.add('scanning');
            document.getElementById('startScanBtn').style.display = 'none';
            document.getElementById('stopScanBtn').style.display = 'inline-block';
            this.startScanLoop();
            window.showAlert('📷 Camera started! Point at QR code', 'success', 2000);
            console.log('✅ Camera started');
        } catch (error) {
            console.error('❌ Camera error:', error);
            window.showAlert('❌ Camera access denied. Try "Test QR" button.', 'danger');
        }
    }

    stopScanning() {
        this.isScanning = false;
        if (this.scanInterval) clearInterval(this.scanInterval);
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        document.getElementById('startScanBtn').style.display = 'inline-block';
        document.getElementById('stopScanBtn').style.display = 'none';
        console.log('⏹️ Camera stopped');
    }

    startScanLoop() {
        if (!this.isScanning) return;
        this.scanInterval = setInterval(() => this.scanFrame(), 100);
    }

    scanFrame() {
        if (!this.isScanning || !this.video || !this.canvas) return;
        if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) return;
        try {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            const context = this.canvas.getContext('2d');
            context.drawImage(this.video, 0, 0);
            const imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            if (typeof jsQR !== 'undefined') {
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert"
                });
                if (code && code.data) {
                    console.log('✅ QR Code detected');
                    this.onQRDetected(code.data);
                }
            }
        } catch (error) {
            console.error('Scan error:', error);
        }
    }

    onQRDetected(qrData) {
        if (qrData === this.lastQRData) return;
        this.lastQRData = qrData;
        this.stopScanning();
        document.getElementById('qrData').textContent = qrData;
        document.getElementById('qrResult').style.display = 'block';
        document.getElementById('instructions').style.display = 'none';
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        window.showAlert('✅ QR Detected! Click to capture photo', 'success');
    }

    testQR() {
        const testData = `ATTEND|1|Test Lecture|${new Date().toISOString()}|test-token-${Date.now()}`;
        this.onQRDetected(testData);
    }

    showPhotoModal() {
        if (!this.lastQRData) {
            window.showAlert('❌ No QR data available', 'danger');
            return;
        }

        const modalId = `modal-${Date.now()}`;
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = modalId;
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-camera"></i> Capture Your Photo
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-center mb-3">📸 Click to take your selfie</p>
                        <input type="file" id="photoInput-${modalId}" accept="image/*" capture="user" style="display:none;">
                        <button class="btn btn-primary btn-lg w-100 mb-3" onclick="document.getElementById('photoInput-${modalId}').click()">
                            <i class="fas fa-camera"></i> Take Photo
                        </button>
                        <div id="photoPreview-${modalId}" style="display:none; text-align:center;">
                            <img id="previewImg-${modalId}" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 1rem;">
                            <p class="text-success"><strong>✅ Photo Ready!</strong></p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" id="confirmBtn-${modalId}" style="display:none;" onclick="window.qrScanner.submitAttendance('${modalId}')">
                            <i class="fas fa-check"></i> Mark Attendance
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        const photoInput = document.getElementById(`photoInput-${modalId}`);
        photoInput.addEventListener('change', (e) => this.handlePhotoCapture(e, modalId));

        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    }

    handlePhotoCapture(event, modalId) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('📸 Photo selected:', file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            this.capturedPhoto = e.target.result;
            console.log('✅ Photo ready for upload');

            document.getElementById(`previewImg-${modalId}`).src = this.capturedPhoto;
            document.getElementById(`photoPreview-${modalId}`).style.display = 'block';
            document.getElementById(`confirmBtn-${modalId}`).style.display = 'block';
            
            window.showAlert('✅ Photo captured! Click "Mark Attendance"', 'success', 2000);
        };
        reader.readAsDataURL(file);
    }

    async submitAttendance(modalId) {
        const user = window.getUser();
        if (!user) {
            window.showAlert('❌ Not logged in', 'danger');
            return;
        }

        if (!this.capturedPhoto || !this.lastQRData) {
            window.showAlert('❌ Photo or QR missing', 'danger');
            return;
        }

        const btn = document.getElementById(`confirmBtn-${modalId}`);
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        console.log('📝 Sending attendance with photo...');

        try {
            const result = await window.apiRequest('/mark-attendance', {
                method: 'POST',
                body: JSON.stringify({
                    qr_data: this.lastQRData,
                    student_id: user.id,
                    photo: this.capturedPhoto
                })
            });

            if (result && result.success) {
                window.showAlert(`🎉 ${result.message}`, 'success', 3000);
                console.log('✅ Attendance marked successfully');

                // Hide modal
                const modalEl = document.getElementById(modalId);
                if (modalEl) {
                    const bsModal = bootstrap.Modal.getInstance(modalEl);
                    if (bsModal) bsModal.hide();
                }

                // Reset UI
                document.getElementById('qrResult').style.display = 'none';
                document.getElementById('instructions').style.display = 'block';
                this.lastQRData = null;
                this.capturedPhoto = null;
            } else {
                window.showAlert(`❌ ${result?.message || 'Failed to mark attendance'}`, 'danger');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Mark Attendance';
            }
        } catch (error) {
            window.showAlert('❌ Network error', 'danger');
            console.error('Error:', error);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Mark Attendance';
        }
    }
}

function initQRScanner() {
    if (document.getElementById('video')) {
        window.qrScanner = new QRCodeScanner();
        console.log('🎬 QR Scanner ready');
    }
}

window.initQRScanner = initQRScanner;
