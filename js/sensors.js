// Sensor Management - js/sensors.js

// Store references to throttled handlers at module level
let throttledMotionHandler = null;
let throttledOrientationHandler = null;

/**
 * Initialize sensor monitoring graphs
 */
function initSensorGraphs() {
    const graphIds = ['accelGraph', 'gyroGraph', 'orientGraph', 'derivedGraph'];

    graphIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const ctx = canvas.getContext('2d');

            // Set canvas resolution for high DPI displays
            const rect = canvas.getBoundingClientRect();
            const dpr = getPixelRatio();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            AppState.sensorGraphs[id] = {
                canvas: canvas,
                ctx: ctx,
                data: { x: [], y: [], z: [] },
                maxPoints: 100,
                colors: ['#ff4444', '#44ff44', '#4444ff'],
                labels: ['X', 'Y', 'Z']
            };

            drawSensorGrid(ctx, canvas, rect.width, rect.height);
        }
    });

    addLog('Sensors', 'Sensor graphs initialized');
}

/**
 * Draw grid background for sensor graphs
 */
function drawSensorGrid(ctx, canvas, width, height) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

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

    // Center line
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
}

/**
 * Update sensor graph with new data
 */
function updateSensorGraph(graphId, x, y, z) {
    const graph = AppState.sensorGraphs[graphId];
    if (!graph) return;

    // Add new data points
    graph.data.x.push(x);
    graph.data.y.push(y);
    graph.data.z.push(z);

    // Keep only recent points
    if (graph.data.x.length > graph.maxPoints) {
        graph.data.x.shift();
        graph.data.y.shift();
        graph.data.z.shift();
    }

    // Redraw graph
    redrawSensorGraph(graph);
}

/**
 * Redraw sensor graph
 */
function redrawSensorGraph(graph) {
    const { ctx, canvas, data, colors, maxPoints } = graph;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Redraw grid
    drawSensorGrid(ctx, canvas, width, height);

    // Draw data lines
    const datasets = [data.x, data.y, data.z];

    datasets.forEach((dataset, index) => {
        if (dataset.length < 2) return;

        ctx.strokeStyle = colors[index];
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Calculate scale factor for the data
        const maxValue = Math.max(...dataset.map(Math.abs));
        const scale = maxValue > 0 ? (height * 0.4) / maxValue : 1;

        dataset.forEach((value, i) => {
            const x = (i / maxPoints) * width;
            const y = height / 2 - (value * scale);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    });

    // Draw legend
    drawGraphLegend(ctx, width, height, graph.labels, colors);
}

/**
 * Draw legend for sensor graph
 */
function drawGraphLegend(ctx, width, height, labels, colors) {
    const legendY = 10;
    const legendX = width - 80;

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#666';

    labels.forEach((label, index) => {
        const y = legendY + (index * 15);

        // Draw color indicator
        ctx.fillStyle = colors[index];
        ctx.fillRect(legendX, y - 8, 10, 2);

        // Draw label
        ctx.fillStyle = '#666';
        ctx.fillText(label, legendX + 15, y - 3);
    });
}

/**
 * Start sensor monitoring
 */
function startSensorMonitoring() {
    if (AppState.isSensorMonitoring) return;

    AppState.isSensorMonitoring = true;
    AppState.sensorData = [];

    // Update UI
    const startBtn = document.getElementById('sensorStartBtn');
    const stopBtn = document.getElementById('sensorStopBtn');
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    // Request permissions if needed
    requestMotionPermission().then(granted => {
        if (granted) {
            startSensorListeners();
            addLog('Sensor monitoring', 'Started real-time sensor monitoring');
            showNotification('Sensor monitoring started', 'success');
        } else {
            stopSensorMonitoring();
        }
    });
}

/**
 * Start device sensor event listeners
 */
function startSensorListeners() {
    // Create throttled handlers if they don't exist
    if (!throttledMotionHandler) {
        throttledMotionHandler = throttle(handleSensorMotionCore, 50);
    }
    if (!throttledOrientationHandler) {
        throttledOrientationHandler = throttle(handleSensorOrientationCore, 100);
    }

    // Device motion (accelerometer + gyroscope)
    window.addEventListener('devicemotion', throttledMotionHandler);

    // Device orientation
    window.addEventListener('deviceorientation', throttledOrientationHandler);

    addLog('Sensors', 'Device motion and orientation listeners activated');
}

/**
 * Core handler for device motion events (not throttled)
 */
function handleSensorMotionCore(event) {
    if (!AppState.isSensorMonitoring) return;

    const acc = event.accelerationIncludingGravity;
    const gyro = event.rotationRate;
    const timestamp = Date.now();

    if (acc) {
        // Update accelerometer display
        document.getElementById('accelX').textContent = formatNumber(acc.x || 0);
        document.getElementById('accelY').textContent = formatNumber(acc.y || 0);
        document.getElementById('accelZ').textContent = formatNumber(acc.z || 0);

        // Calculate magnitude (convert to G)
        const magnitude = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2) / 9.81;
        document.getElementById('magnitude').textContent = formatNumber(magnitude);

        // Calculate jerk (rate of change of acceleration)
        const jerk = calculateJerk(acc, AppState.previousAcceleration, timestamp);
        document.getElementById('jerk').textContent = formatNumber(jerk);

        AppState.previousAcceleration = {
            x: acc.x || 0,
            y: acc.y || 0,
            z: acc.z || 0,
            timestamp: timestamp
        };

        // Update accelerometer graph
        updateSensorGraph('accelGraph', acc.x || 0, acc.y || 0, acc.z || 0);
    }

    if (gyro) {
        // Update gyroscope display
        document.getElementById('gyroX').textContent = formatNumber(gyro.x || 0);
        document.getElementById('gyroY').textContent = formatNumber(gyro.y || 0);
        document.getElementById('gyroZ').textContent = formatNumber(gyro.z || 0);

        // Calculate angular magnitude
        const angularMagnitude = Math.sqrt((gyro.x || 0)**2 + (gyro.y || 0)**2 + (gyro.z || 0)**2);
        document.getElementById('angular').textContent = formatNumber(angularMagnitude);

        // Update gyroscope graph
        updateSensorGraph('gyroGraph', gyro.x || 0, gyro.y || 0, gyro.z || 0);
    }

    // Store sensor data
    const magnitude = parseFloat(document.getElementById('magnitude').textContent || 0);
    const angularMagnitude = parseFloat(document.getElementById('angular').textContent || 0);

    AppState.sensorData.push({
        timestamp: timestamp,
        acceleration: {
            x: acc?.x || 0,
            y: acc?.y || 0,
            z: acc?.z || 0,
            magnitude: magnitude
        },
        gyroscope: {
            x: gyro?.x || 0,
            y: gyro?.y || 0,
            z: gyro?.z || 0,
            magnitude: angularMagnitude
        }
    });

    // Limit stored data to prevent memory issues
    if (AppState.sensorData.length > 10000) {
        AppState.sensorData = AppState.sensorData.slice(-5000);
    }
}

/**
 * Core handler for device orientation events (not throttled)
 */
function handleSensorOrientationCore(event) {
    if (!AppState.isSensorMonitoring) return;

    // Update orientation display
    document.getElementById('orientAlpha').textContent = Math.round(event.alpha || 0);
    document.getElementById('orientBeta').textContent = Math.round(event.beta || 0);
    document.getElementById('orientGamma').textContent = Math.round(event.gamma || 0);

    // Update orientation graph (scale to smaller range for visibility)
    updateSensorGraph('orientGraph',
        (event.alpha || 0) / 10,
        (event.beta || 0) / 10,
        (event.gamma || 0) / 10
    );

    // Update derived metrics graph
    const magnitude = parseFloat(document.getElementById('magnitude').textContent || 0);
    const jerk = parseFloat(document.getElementById('jerk').textContent || 0);
    const angular = parseFloat(document.getElementById('angular').textContent || 0);
    updateSensorGraph('derivedGraph', magnitude, jerk / 10, angular);
}

/**
 * Calculate jerk (rate of change of acceleration)
 */
function calculateJerk(currentAcc, previousAcc, currentTime) {
    if (!previousAcc.timestamp) return 0;

    const dt = (currentTime - previousAcc.timestamp) / 1000; // Convert to seconds
    if (dt <= 0 || dt > 1) return 0; // Ignore if no time passed or too much time

    const jerkX = Math.abs((currentAcc.x || 0) - previousAcc.x) / dt;
    const jerkY = Math.abs((currentAcc.y || 0) - previousAcc.y) / dt;
    const jerkZ = Math.abs((currentAcc.z || 0) - previousAcc.z) / dt;

    return Math.sqrt(jerkX**2 + jerkY**2 + jerkZ**2);
}

/**
 * Stop sensor monitoring
 */
function stopSensorMonitoring() {
    if (!AppState.isSensorMonitoring) return;

    AppState.isSensorMonitoring = false;

    // Update UI
    const startBtn = document.getElementById('sensorStartBtn');
    const stopBtn = document.getElementById('sensorStopBtn');
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    // Remove event listeners using the stored references
    if (throttledMotionHandler) {
        window.removeEventListener('devicemotion', throttledMotionHandler);
    }
    if (throttledOrientationHandler) {
        window.removeEventListener('deviceorientation', throttledOrientationHandler);
    }

    addLog('Sensor monitoring', `Stopped monitoring. Collected ${AppState.sensorData.length} data points`);
    showNotification(`Monitoring stopped. Collected ${AppState.sensorData.length} data points`, 'info');
}

/**
 * Reset sensor data and displays
 */
function resetSensorData() {
    AppState.sensorData = [];
    AppState.previousAcceleration = { x: 0, y: 0, z: 0, timestamp: 0 };

    // Reset all displays
    const sensorIds = [
        'accelX', 'accelY', 'accelZ',
        'gyroX', 'gyroY', 'gyroZ',
        'orientAlpha', 'orientBeta', 'orientGamma',
        'magnitude', 'jerk', 'angular'
    ];

    sensorIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '0.00';
        }
    });

    // Clear all graphs
    Object.values(AppState.sensorGraphs).forEach(graph => {
        graph.data = { x: [], y: [], z: [] };
        const rect = graph.canvas.getBoundingClientRect();
        graph.ctx.clearRect(0, 0, rect.width, rect.height);
        drawSensorGrid(graph.ctx, graph.canvas, rect.width, rect.height);
    });

    addLog('Sensor reset', 'Sensor data and displays reset');
    showNotification('Sensor data reset', 'success');
}

/**
 * Export sensor data in various formats
 */
function exportSensorData(format) {
    if (AppState.sensorData.length === 0) {
        showNotification('No sensor data to export. Start monitoring first.', 'warning');
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    let dataStr = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
        case 'csv':
            ({ dataStr, filename, mimeType } = exportAsCSV(timestamp));
            break;
        case 'json':
            ({ dataStr, filename, mimeType } = exportAsJSON(timestamp));
            break;
        case 'analysis':
            ({ dataStr, filename, mimeType } = exportAsAnalysis(timestamp));
            break;
        default:
            showNotification('Unknown export format', 'error');
            return;
    }

    downloadData(dataStr, filename, mimeType);
    addLog('Data export', `Exported ${AppState.sensorData.length} data points as ${format.toUpperCase()}`);
    showNotification(`Data exported as ${format.toUpperCase()}`, 'success');
}

/**
 * Export data as CSV format
 */
function exportAsCSV(timestamp) {
    const headers = [
        'Timestamp', 'AccelX', 'AccelY', 'AccelZ', 'AccelMagnitude',
        'GyroX', 'GyroY', 'GyroZ', 'GyroMagnitude'
    ];

    let dataStr = headers.join(',') + '\n';

    AppState.sensorData.forEach(row => {
        const csvRow = [
            row.timestamp,
            row.acceleration.x,
            row.acceleration.y,
            row.acceleration.z,
            row.acceleration.magnitude,
            row.gyroscope.x,
            row.gyroscope.y,
            row.gyroscope.z,
            row.gyroscope.magnitude || 0
        ].join(',');
        dataStr += csvRow + '\n';
    });

    return {
        dataStr,
        filename: `sensor-data-${timestamp}.csv`,
        mimeType: 'text/csv'
    };
}

/**
 * Export data as JSON format
 */
function exportAsJSON(timestamp) {
    const exportData = {
        exportDate: new Date().toISOString(),
        deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
        },
        dataPoints: AppState.sensorData.length,
        duration: AppState.sensorData.length > 0 ?
            AppState.sensorData[AppState.sensorData.length - 1].timestamp - AppState.sensorData[0].timestamp : 0,
        data: AppState.sensorData
    };

    return {
        dataStr: JSON.stringify(exportData, null, 2),
        filename: `sensor-data-${timestamp}.json`,
        mimeType: 'application/json'
    };
}

/**
 * Export data with full analysis
 */
function exportAsAnalysis(timestamp) {
    const analysis = {
        exportDate: new Date().toISOString(),
        summary: {
            totalDataPoints: AppState.sensorData.length,
            duration: AppState.sensorData.length > 0 ?
                AppState.sensorData[AppState.sensorData.length - 1].timestamp - AppState.sensorData[0].timestamp : 0,
            samplingRate: calculateSamplingRate(),
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                pixelRatio: getPixelRatio()
            }
        },
        statistics: calculateSensorStatistics(),
        peaks: detectMotionPeaks(),
        rawData: AppState.sensorData
    };

    return {
        dataStr: JSON.stringify(analysis, null, 2),
        filename: `sensor-analysis-${timestamp}.json`,
        mimeType: 'application/json'
    };
}

/**
 * Calculate sampling rate from sensor data
 */
function calculateSamplingRate() {
    if (AppState.sensorData.length < 2) return 0;

    const totalTime = AppState.sensorData[AppState.sensorData.length - 1].timestamp -
        AppState.sensorData[0].timestamp;
    return (AppState.sensorData.length - 1) / (totalTime / 1000); // Hz
}

/**
 * Calculate comprehensive sensor statistics
 */
function calculateSensorStatistics() {
    if (AppState.sensorData.length === 0) return {};

    // Extract data arrays
    const accelX = AppState.sensorData.map(d => d.acceleration.x);
    const accelY = AppState.sensorData.map(d => d.acceleration.y);
    const accelZ = AppState.sensorData.map(d => d.acceleration.z);
    const accelMag = AppState.sensorData.map(d => d.acceleration.magnitude);

    const gyroX = AppState.sensorData.map(d => d.gyroscope.x);
    const gyroY = AppState.sensorData.map(d => d.gyroscope.y);
    const gyroZ = AppState.sensorData.map(d => d.gyroscope.z);

    return {
        acceleration: {
            x: calculateStats(accelX),
            y: calculateStats(accelY),
            z: calculateStats(accelZ),
            magnitude: calculateStats(accelMag)
        },
        gyroscope: {
            x: calculateStats(gyroX),
            y: calculateStats(gyroY),
            z: calculateStats(gyroZ)
        },
        motion: {
            totalMovement: accelMag.reduce((sum, val) => sum + Math.abs(val - 1), 0),
            maxAcceleration: Math.max(...accelMag),
            avgAcceleration: accelMag.reduce((sum, val) => sum + val, 0) / accelMag.length
        }
    };
}

/**
 * Detect motion peaks in sensor data
 */
function detectMotionPeaks() {
    if (AppState.sensorData.length === 0) return [];

    const magnitudes = AppState.sensorData.map(d => d.acceleration.magnitude);
    const peaks = detectPeaks(magnitudes, 1.5, 20); // Threshold 1.5G, min distance 20 samples

    return peaks.map(peak => ({
        ...peak,
        timestamp: AppState.sensorData[peak.index].timestamp,
        timeFromStart: AppState.sensorData[peak.index].timestamp - AppState.sensorData[0].timestamp
    }));
}