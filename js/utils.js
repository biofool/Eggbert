// Utility Functions - js/utils.js

/**
 * Add entry to system logs
 */
function addLog(category, message) {
    const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        category: category,
        message: message,
        id: Date.now() + Math.random()
    };

    AppState.systemLogs.unshift(logEntry);

    // Keep only last 100 entries
    if (AppState.systemLogs.length > 100) {
        AppState.systemLogs = AppState.systemLogs.slice(0, 100);
    }

    // Update logs display if visible
    if (AppState.currentMode === 'logs') {
        updateLogsDisplay();
    }

    // Save to localStorage periodically
    if (AppState.systemLogs.length % 10 === 0) {
        saveLogsToStorage();
    }
}

/**
 * Update logs display in UI
 */
function updateLogsDisplay() {
    const container = document.getElementById('logContainer');
    if (!container) return;

    let html = '';

    AppState.systemLogs.forEach(log => {
        html += `
            <div class="log-entry" data-category="${log.category}">
                <div class="log-timestamp">
                    <i class="fas fa-clock"></i> ${log.timestamp}
                    <span class="log-category">[${log.category}]</span>
                </div>
                <div class="log-message">${escapeHtml(log.message)}</div>
            </div>
        `;
    });

    if (html === '') {
        html = `
            <div class="log-entry">
                <div class="log-timestamp">No logs available</div>
                <div class="log-message">System logs will appear here</div>
            </div>
        `;
    }

    container.innerHTML = html;
}

/**
 * Clear all system logs
 */
function clearLogs() {
    AppState.systemLogs = [];
    updateLogsDisplay();
    localStorage.removeItem('rollAnalyzerLogs');
    addLog('System', 'All logs cleared');
    showNotification('System logs cleared', 'success');
}

/**
 * Export logs to JSON file
 */
function exportLogs() {
    if (AppState.systemLogs.length === 0) {
        showNotification('No logs to export', 'warning');
        return;
    }

    const exportData = {
        exportDate: new Date().toISOString(),
        totalEntries: AppState.systemLogs.length,
        logs: AppState.systemLogs
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    downloadData(dataStr, `roll-analyzer-logs-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');

    addLog('Export', `Exported ${AppState.systemLogs.length} log entries`);
    showNotification('Logs exported successfully', 'success');
}

/**
 * Save logs to localStorage
 */
function saveLogsToStorage() {
    try {
        localStorage.setItem('rollAnalyzerLogs', JSON.stringify(AppState.systemLogs));
    } catch (error) {
        console.error('Failed to save logs:', error);
    }
}

/**
 * Escape HTML characters to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Format number with specified decimal places
 */
function formatNumber(num, decimals = 2) {
    if (isNaN(num)) return '--';
    return Number(num).toFixed(decimals);
}

/**
 * Format time duration in human readable format
 */
function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit function calls
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Calculate statistics for an array of numbers
 */
function calculateStats(array) {
    if (!array || array.length === 0) {
        return { min: 0, max: 0, avg: 0, std: 0 };
    }

    const min = Math.min(...array);
    const max = Math.max(...array);
    const avg = array.reduce((sum, val) => sum + val, 0) / array.length;

    // Standard deviation
    const variance = array.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / array.length;
    const std = Math.sqrt(variance);

    return { min, max, avg, std };
}

/**
 * Convert degrees to radians
 */
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

/**
 * Map value from one range to another
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Calculate distance between two 3D points
 */
function distance3D(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate magnitude of 3D vector
 */
function magnitude3D(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

/**
 * Normalize 3D vector
 */
function normalize3D(vector) {
    const mag = magnitude3D(vector);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    return {
        x: vector.x / mag,
        y: vector.y / mag,
        z: vector.z / mag
    };
}

/**
 * Apply moving average filter to data
 */
function movingAverage(data, windowSize = 5) {
    if (!data || data.length === 0) return [];

    const result = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
        const window = data.slice(start, end);
        const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
        result.push(avg);
    }
    return result;
}

/**
 * Apply low-pass filter to reduce noise
 */
function lowPassFilter(data, alpha = 0.1) {
    if (!data || data.length === 0) return [];

    const filtered = [data[0]];
    for (let i = 1; i < data.length; i++) {
        filtered[i] = alpha * data[i] + (1 - alpha) * filtered[i - 1];
    }
    return filtered;
}

/**
 * Detect peaks in data array
 */
function detectPeaks(data, threshold = 0.1, minDistance = 10) {
    const peaks = [];

    for (let i = minDistance; i < data.length - minDistance; i++) {
        let isPeak = true;

        // Check if current point is higher than threshold
        if (data[i] < threshold) continue;

        // Check if it's a local maximum
        for (let j = i - minDistance; j <= i + minDistance; j++) {
            if (j !== i && data[j] >= data[i]) {
                isPeak = false;
                break;
            }
        }

        if (isPeak) {
            peaks.push({
                index: i,
                value: data[i]
            });
        }
    }

    return peaks;
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Generate a 4-character room code.
 */
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}


/**
 * Deep clone object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Check if device is mobile
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device supports touch
 */
function hasTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get device pixel ratio
 */
function getPixelRatio() {
    return window.devicePixelRatio || 1;
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Download data as file
 */
function downloadData(data, filename, mimeType = 'text/plain') {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copied to clipboard!', 'success');
        return true;
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showNotification('Copied to clipboard!', 'success');
            } else {
                showNotification('Failed to copy', 'error');
            }
        } catch (err) {
            showNotification('Failed to copy', 'error');
        }
        document.body.removeChild(textArea);
        return false;
    }
}
