// RoadWatch AI // Futuristic Damage detection Canvas & Scan Visuals

const DetectionScanner = {
    canvas: null,
    ctx: null,
    animationFrameId: null,
    image: null,
    isScanning: false,
    scanLineY: 0,
    scanDirection: 1,
    detections: [],
    
    init() {
        this.canvas = document.getElementById('detection-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.clearCanvas();
    },
    
    clearCanvas() {
        this.ctx.fillStyle = '#02050a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw decorative crosshairs
        this.ctx.strokeStyle = 'rgba(0, 180, 216, 0.15)';
        this.ctx.lineWidth = 1;
        
        // Horizontal center
        this.ctx.beginPath();
        this.ctx.moveTo(10, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width - 10, this.canvas.height / 2);
        this.ctx.stroke();
        
        // Vertical center
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 10);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height - 10);
        this.ctx.stroke();
        
        // Corners decoration
        this.drawCornerDeco();
    },
    
    drawCornerDeco() {
        const size = 15;
        this.ctx.strokeStyle = 'var(--neon-cyan)';
        this.ctx.lineWidth = 2;
        
        // Top Left
        this.ctx.beginPath();
        this.ctx.moveTo(10, 10 + size);
        this.ctx.lineTo(10, 10);
        this.ctx.lineTo(10 + size, 10);
        this.ctx.stroke();
        
        // Top Right
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - 10, 10 + size);
        this.ctx.lineTo(this.canvas.width - 10, 10);
        this.ctx.lineTo(this.canvas.width - 10 - size, 10);
        this.ctx.stroke();
        
        // Bottom Left
        this.ctx.beginPath();
        this.ctx.moveTo(10, this.canvas.height - 10 - size);
        this.ctx.lineTo(10, this.canvas.height - 10);
        this.ctx.lineTo(10 + size, this.canvas.height - 10);
        this.ctx.stroke();
        
        // Bottom Right
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - 10, this.canvas.height - 10 - size);
        this.ctx.lineTo(this.canvas.width - 10, this.canvas.height - 10);
        this.ctx.lineTo(this.canvas.width - 10 - size, this.canvas.height - 10);
        this.ctx.stroke();
    },
    
    loadImage(file) {
        this.stopScan();
        this.image = new Image();
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.image.onload = () => {
                this.startScan();
            };
            this.image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },
    
    startScan() {
        this.isScanning = true;
        this.scanLineY = 0;
        this.detections = [];
        this.animate();
        
        // Show scan elements
        document.getElementById('scan-overlay-bar').classList.remove('hidden');
        document.getElementById('viewport-placeholder').classList.add('hidden');
    },
    
    stopScan() {
        this.isScanning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        document.getElementById('scan-overlay-bar').classList.add('hidden');
    },
    
    animate() {
        if (!this.isScanning) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the image scaled to fit
        const scale = Math.min(this.canvas.width / this.image.width, this.canvas.height / this.image.height);
        const w = this.image.width * scale;
        const h = this.image.height * scale;
        const x = (this.canvas.width - w) / 2;
        const y = (this.canvas.height - h) / 2;
        
        this.ctx.drawImage(this.image, x, y, w, h);
        
        // Draw HUD matrix grids on top
        this.drawScanOverlay();
        
        // Draw current target laser
        this.drawLaserLine(y, h);
        
        // Draw temporary/final targets
        this.drawDetections(x, y, scale);
        
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    },
    
    drawLaserLine(yOffset, height) {
        // Increment laser line position
        this.scanLineY += 4 * this.scanDirection;
        if (this.scanLineY > height) {
            this.scanDirection = -1;
        } else if (this.scanLineY < 0) {
            this.scanDirection = 1;
        }
        
        const currentY = yOffset + this.scanLineY;
        
        // Laser glow stroke
        this.ctx.strokeStyle = 'rgba(0, 180, 216, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(10, currentY);
        this.ctx.lineTo(this.canvas.width - 10, currentY);
        this.ctx.stroke();
        
        // Glow shadow
        this.ctx.strokeStyle = 'rgba(0, 180, 216, 0.3)';
        this.ctx.lineWidth = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(10, currentY);
        this.ctx.lineTo(this.canvas.width - 10, currentY);
        this.ctx.stroke();
    },
    
    drawScanOverlay() {
        // Digital overlay graphics
        this.ctx.font = '9px "Share Tech Mono"';
        this.ctx.fillStyle = 'rgba(0, 180, 216, 0.6)';
        this.ctx.fillText(`SYS_SCAN_HZ: 60FPS`, 20, 25);
        this.ctx.fillText(`MATRIX_SECT: A-12`, 20, 38);
        this.ctx.fillText(`RESOLUTION: 640x480`, 20, 51);
        
        this.drawCornerDeco();
    },
    
    drawDetections(imgX, imgY, scale) {
        if (this.detections.length === 0) return;
        
        this.detections.forEach(det => {
            // Map bounding box coordinate relative to scale
            const x = imgX + det.bbox[0];
            const y = imgY + det.bbox[1];
            const w = det.bbox[2];
            const h = det.bbox[3];
            
            // Choose color based on severity
            let boxColor = 'var(--neon-cyan)';
            if (det.severity === 'High') {
                boxColor = 'var(--health-critical)';
            } else if (det.severity === 'Medium') {
                boxColor = 'var(--health-fair)';
            }
            
            this.ctx.strokeStyle = boxColor;
            this.ctx.lineWidth = 2;
            
            // Draw box corners
            const pad = 4;
            const length = 12;
            
            // Top Left corner
            this.ctx.beginPath();
            this.ctx.moveTo(x - pad, y - pad + length);
            this.ctx.lineTo(x - pad, y - pad);
            this.ctx.lineTo(x - pad + length, y - pad);
            this.ctx.stroke();
            
            // Top Right
            this.ctx.beginPath();
            this.ctx.moveTo(x + w + pad, y - pad + length);
            this.ctx.lineTo(x + w + pad, y - pad);
            this.ctx.lineTo(x + w + pad - length, y - pad);
            this.ctx.stroke();
            
            // Bottom Left
            this.ctx.beginPath();
            this.ctx.moveTo(x - pad, y + h + pad - length);
            this.ctx.lineTo(x - pad, y + h + pad);
            this.ctx.lineTo(x - pad + length, y + h + pad);
            this.ctx.stroke();
            
            // Bottom Right
            this.ctx.beginPath();
            this.ctx.moveTo(x + w + pad, y + h + pad - length);
            this.ctx.lineTo(x + w + pad, y + h + pad);
            this.ctx.lineTo(x + w + pad - length, y + h + pad);
            this.ctx.stroke();
            
            // Translucent box fill
            this.ctx.fillStyle = det.severity === 'High' ? 'rgba(255, 23, 68, 0.05)' : 'rgba(0, 180, 216, 0.05)';
            this.ctx.fillRect(x, y, w, h);
            
            // Label tag background
            this.ctx.fillStyle = boxColor;
            this.ctx.fillRect(x - pad, y - pad - 18, Math.max(w / 1.5, 120), 18);
            
            // Text Label
            this.ctx.fillStyle = '#040810';
            this.ctx.font = '10px "Outfit"';
            this.ctx.fontWeight = 'bold';
            this.ctx.fillText(`${det.type.toUpperCase()} // CONF: ${(det.confidence * 100).toFixed(0)}%`, x + 2, y - 8);
        });
    },
    
    setDetections(detections) {
        this.isScanning = false; // Stop moving scanning line
        document.getElementById('scan-overlay-bar').classList.add('hidden');
        this.detections = detections;
    }
};

window.addEventListener('DOMContentLoaded', () => {
    DetectionScanner.init();
});
