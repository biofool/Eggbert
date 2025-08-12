// UI Management - js/ui.js

/**
 * Initialize canvas for acceleration graph
 */
function initCanvas() {
    const canvas = document.getElementById('accelerationGraph');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size with high DPI support
    const rect = canvas.getBoundingClientRect();
    const dpr = getPixelRatio();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Store dimensions for drawing
    canvas._displayWidth = rect.width;
    canvas._displayHeight = rect.height;

    // Draw initial grid
    drawGrid(ctx, rect.width, rect.height);
}

/**
 * Draw grid background for graphs
 */
function drawGrid(ctx, width, height) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Add axis labels
    drawGridLabels(ctx, width, height);
}

/**
 * Draw labels for grid axes
 */
function drawGridLabels(ctx, width, height) {
    ctx.fillStyle = '#999';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';

    // Time labels (bottom)
    for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        const timeLabel = `${i}s`;
        ctx.fillText(timeLabel, x, height - 5);
    }

    // Force labels (left side)
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        const forceLabel = `${4 - i}G`;
        ctx.fillText(forceLabel, 25, y + 3);
    }
}

/**
 * Draw acceleration graph
 */
function drawGraph() {
    const canvas = document.getElementById('accelerationGraph');
    if (!canvas || AppState.accelerationData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas._displayWidth;
    const height = canvas._displayHeight;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Redraw grid
    drawGrid(ctx, width, height);

    if (AppState.accelerationData.length < 2) return;

    // Calculate scales
    const timeScale = width / (AppState.accelerationData[AppState.accelerationData.length - 1].time);
    const forceScale = height / 4; // Max 4G display

    // Draw magnitude line (main signal)
    drawDataLine(ctx, AppState.accelerationData, 'magnitude', '#667eea', timeScale, forceScale, height, 3);

    // Draw individual axis lines if data is not too dense
    if (AppState.accelerationData.length < 500) {
        drawDataLine(ctx, AppState.accelerationData, 'x', 'rgba(255, 68, 68, 0.7)', timeScale, forceScale / 2, height / 2, 1.5);
        drawDataLine(ctx, AppState.accelerationData, 'y', 'rgba(68, 255, 68, 0.7)', timeScale, forceScale / 2, height / 2, 1.5);
        drawDataLine(ctx, AppState.accelerationData, 'z', 'rgba(68, 68, 255, 0.7)', timeScale, forceScale / 2, height / 2, 1.5);
    }

    // Draw legend
    drawGraphLegend(ctx, width, height);

    // Draw analysis markers
    if (!AppState.isRecording) {
        drawAnalysisMarkers(ctx, width, height, timeScale, forceScale);
    }
}

/**
 * Draw a data line on the graph
 */
function drawDataLine(ctx, data, property, color, timeScale, forceScale, baseline, lineWidth) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    data.forEach((point, index) => {
        const x = point.time * timeScale;
        const y = baseline - (point[property] * forceScale);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
}

/**
 * Draw legend for the graph
 */
function drawGraphLegend(ctx, width, height) {
    const legends = [
        { color: '#667eea', label: 'Magnitude', lineWidth: 3 },
        { color: 'rgba(255, 68, 68, 0.7)', label: 'X-Axis', lineWidth: 1.5 },
        { color: 'rgba(68, 255, 68, 0.7)', label: 'Y-Axis', lineWidth: 1.5 },
        { color: 'rgba(68, 68, 255, 0.7)', label: 'Z-Axis', lineWidth: 1.5 }
    ];

    const legendX = width - 80;
    let legendY = 15;

    ctx.font = '11px Inter, sans-serif';

    legends.forEach(legend => {
        // Draw line sample
        ctx.strokeStyle = legend.color;
        ctx.lineWidth = legend.lineWidth;
        ctx.beginPath();
        ctx.moveTo(legendX, legendY);
        ctx.lineTo(legendX + 15, legendY);
        ctx.stroke();

        // Draw label
        ctx.fillStyle = '#333';
        ctx.fillText(legend.label, legendX + 20, legendY + 4);

        legendY += 18;
    });
}

/**
 * Draw analysis markers on the graph
 */
function drawAnalysisMarkers(ctx, width, height, timeScale, forceScale) {
    if (AppState.accelerationData.length === 0) return;

    // Find peak
    const peakIndex = AppState.accelerationData.reduce((maxIndex, point, index, arr) =>
        point.magnitude > arr[maxIndex].magnitude ? index : maxIndex, 0);

    const peakPoint = AppState.accelerationData[peakIndex];
    const peakX = peakPoint.time * timeScale;
    const peakY = height - (peakPoint.magnitude * forceScale);

    // Draw peak marker
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Draw peak label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Peak: ${peakPoint.magnitude.toFixed(2)}G`, peakX, peakY - 10);
}

/**
 * Animation loop for real-time graph updates
 */
function animate() {
    if (AppState.isRecording) {
        drawGraph();
        AppState.animationId = requestAnimationFrame(animate);
    }
}

/**
 * Create and show notification
 */
function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notifications of the same type
    const existingNotifications = document.querySelectorAll(`.notification-${type}`);
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        addNotificationStyles();
    }

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('notification-show'), 10);

    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('notification-show');
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

/**
 * Add notification styles to page
 */
function addNotificationStyles() {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }
        
        .notification-show {
            transform: translateX(0);
        }
        
        .notification-info { border-left-color: #2196f3; }
        .notification-success { border-left-color: #4caf50; }
        .notification-warning { border-left-color: #ff9800; }
        .notification-error { border-left-color: #f44336; }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
        }
        
        .notification-content i {
            font-size: 1.1em;
        }
        
        .notification-info i { color: #2196f3; }
        .notification-success i { color: #4caf50; }
        .notification-warning i { color: #ff9800; }
        .notification-error i { color: #f44336; }
        
        .notification-message {
            font-size: 0.9em;
            line-height: 1.4;
            color: #333;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 0.9em;
            color: #999;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .notification-close:hover {
            background: #f0f0f0;
            color: #666;
        }
        
        @media (max-width: 480px) {
            .notification {
                right: 10px;
                left: 10px;
                max-width: none;
                top: 10px;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Get appropriate icon for notification type
 */
function getNotificationIcon(type) {
    const icons = {
        info: 'info-circle',
        success: 'check-circle',
        warning: 'exclamation-triangle',
        error: 'times-circle'
    };
    return icons[type] || 'info-circle';
}

/**
 * Create loading overlay
 */
function showLoadingOverlay(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        }
        
        .loading-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }
        
        .loading-message {
            color: #333;
            font-size: 1.1em;
            font-weight: 500;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    return overlay;
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Create modal dialog
 */
function showModal(title, content, buttons = []) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    let buttonsHTML = '';
    if (buttons.length === 0) {
        buttonsHTML = '<button class="modal-btn modal-btn-primary" onclick="this.closest(\'.modal-overlay\').remove()">OK</button>';
    } else {
        buttonsHTML = buttons.map(btn =>
            `<button class="modal-btn modal-btn-${btn.type || 'secondary'}" onclick="${btn.onclick || 'this.closest(\'.modal-overlay\').remove()'}">${btn.text}</button>`
        ).join('');
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${buttonsHTML}
            </div>
        </div>
    `;

    // Add modal styles if not present
    if (!document.querySelector('#modal-styles')) {
        addModalStyles();
    }

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('modal-show'), 10);

    return modal;
}

/**
 * Add modal styles
 */
function addModalStyles() {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .modal-show {
            opacity: 1;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow: hidden;
            transform: scale(0.9);
            transition: transform 0.3s ease;
        }
        
        .modal-show .modal-content {
            transform: scale(1);
        }
        
        .modal-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .modal-header h3 {
            margin: 0;
            color: #333;
            font-size: 1.3em;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.2em;
            color: #999;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        
        .modal-close:hover {
            background: #f0f0f0;
            color: #666;
        }
        
        .modal-body {
            padding: 20px 24px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .modal-footer {
            padding: 16px 24px 20px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        
        .modal-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 0.9em;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .modal-btn-primary {
            background: #667eea;
            color: white;
        }
        
        .modal-btn-primary:hover {
            background: #5a6fd8;
        }
        
        .modal-btn-secondary {
            background: #f5f5f5;
            color: #333;
        }
        
        .modal-btn-secondary:hover {
            background: #e0e0e0;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Update progress bar
 */
function updateProgressBar(elementId, progress, label = '') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const percentage = Math.max(0, Math.min(100, progress));

    element.innerHTML = `
        <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            <div class="progress-bar-label">${label || `${Math.round(percentage)}%`}</div>
        </div>
    `;

    // Add progress bar styles if not present
    if (!document.querySelector('#progress-bar-styles')) {
        addProgressBarStyles();
    }
}

/**
 * Add progress bar styles
 */
function addProgressBarStyles() {
    const style = document.createElement('style');
    style.id = 'progress-bar-styles';
    style.textContent = `
        .progress-bar-container {
            position: relative;
            width: 100%;
            height: 24px;
            background: #f0f0f0;
            border-radius: 12px;
            overflow: hidden;
        }
        
        .progress-bar-