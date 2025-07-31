class CameraScanner {
  constructor() {
    this.video = document.getElementById('cameraPreview');
    this.canvas = document.getElementById('captureCanvas');
    this.preview = document.getElementById('capturePreview');
    this.startBtn = document.getElementById('startCamera');
    this.captureBtn = document.getElementById('captureBtn');
    this.stopBtn = document.getElementById('stopCamera');
    this.switchBtn = document.getElementById('switchCamera');
    this.retakeBtn = document.getElementById('retakeBtn');
    this.errorDisplay = document.getElementById('cameraError');
    this.previewContainer = document.getElementById('previewContainer');

    this.stream = null;
    this.facingMode = 'environment'; // Default to rear camera
    this.setupEvents();
  }

  setupEvents() {
    this.startBtn.addEventListener('click', () => this.startCamera());
    this.captureBtn.addEventListener('click', () => this.captureImage());
    this.stopBtn.addEventListener('click', () => this.stopCamera());
    this.switchBtn.addEventListener('click', () => this.switchCamera());
    this.retakeBtn.addEventListener('click', () => this.retakePhoto());
  }

  async startCamera() {
    try {
      this.errorDisplay.classList.add('hidden');

      const constraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.video.classList.remove('hidden');

      // Show camera controls
      this.captureBtn.classList.remove('hidden');
      this.stopBtn.classList.remove('hidden');
      this.switchBtn.classList.remove('hidden');
      this.startBtn.classList.add('hidden');
      this.previewContainer.classList.add('hidden');

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          resolve();
        };
      });
    } catch (err) {
      this.handleCameraError(err);
    }
  }

  captureImage() {
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    const context = this.canvas.getContext('2d');

    // Draw video frame to canvas
    context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    // Show preview
    this.preview.src = this.canvas.toDataURL('image/jpeg', 0.9);
    this.previewContainer.classList.remove('hidden');

    // Hide camera temporarily
    this.video.classList.add('hidden');
    this.uploadScan();
  }

  async retakePhoto() {
    this.previewContainer.classList.add('hidden');
    this.video.classList.remove('hidden');
  }

  async stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.video.srcObject = null;
    }

    // Reset UI
    this.video.classList.add('hidden');
    this.startBtn.classList.remove('hidden');
    this.captureBtn.classList.add('hidden');
    this.stopBtn.classList.add('hidden');
    this.switchBtn.classList.add('hidden');
  }

  async switchCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    await this.stopCamera();
    await this.startCamera();
  }

  handleCameraError(error) {
    console.error('Camera Error:', error);
    this.errorDisplay.textContent = this.getUserFriendlyError(error);
    this.errorDisplay.classList.remove('hidden');

    // Show fallback file input
    if (error.name === 'NotAllowedError') {
      alert('Please allow camera access to use this feature');
    }
  }

  getUserFriendlyError(error) {
    const errors = {
      NotAllowedError: 'Camera access was denied',
      NotFoundError: 'No camera found',
      NotReadableError: 'Camera is already in use',
      OverconstrainedError: "Camera doesn't support requested mode",
      SecurityError: 'Camera access blocked by security policy',
      default: 'Could not access camera',
    };

    return errors[error.name] || errors.default;
  }

  async uploadScan() {
    if (!this.canvas) return;

    // Convert canvas to blob
    this.canvas.toBlob(
      async (blob) => {
        const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' });
        await this.sendToServer(file);
      },
      'image/jpeg',
      0.85,
    );
  }

  async sendToServer(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/admin/scans/upload/new', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      this.displayResults(result);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    }
  }

  displayResults(result) {
    // Update your UI with OCR results
    console.log('OCR Results:', result);
    // Implement your result display logic here
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
    new CameraScanner();
  } else {
    document.getElementById('cameraError').textContent =
      'Camera API not supported in your browser';
    document.getElementById('startCamera').disabled = true;
  }
});
