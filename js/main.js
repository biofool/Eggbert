// Main Application Logic - js/main.js

// App Configuration
const APP_TITLE = "Slow Your Roll: Helper!";

// Set app title in both page title and header
function setAppTitle() {
    document.title = APP_TITLE;
    const pageTitle = document.getElementById('pageTitle');
    const headerTitle = document.getElementById('headerTitle');
    
    if (pageTitle) pageTitle.textContent = APP_TITLE;
    if (headerTitle) headerTitle.textContent = APP_TITLE;
}

// Compatibility Functions
// Add these to main.js or create a new compatibility.js file
// These bridge the gap between old function calls and new implementations

/**
 * Initialize canvas (compatibility wrapper for Chart.js)
 */
function initCanvas() {
    // This is now handled by Chart.js
    if (!AppState.charts.acceleration) {
        initAccelerationChart();
    }
}

/**
 * Draw graph (compatibility wrapper)
 */
function drawGraph() {
    // Update the Chart.js graph
    updateAccelerationChart();
}

/**
 * Animation loop for recording
 */
function animate() {
    if (AppState.isRecording) {
        // Update the chart with current data
        updateAccelerationChart();

        // Continue animation
        AppState.animationId = requestAnimationFrame(animate);
    }
}

/**
 * Load system logs (stub for missing function)
 */
function loadSystemLogs() {
    try {
        const savedLogs = localStorage.getItem('rollAnalyzerLogs');
        if (savedLogs) {
            AppState.systemLogs = JSON.parse(savedLogs);
            addLog('System', `Loaded ${AppState.systemLogs.length} historical log entries`);
        }
    } catch (e) {
        console.error('Failed to load system logs:', e);
    }
}

/**
 * Update the acceleration chart to ensure it exists and has proper data format
 */
function updateAccelerationChart() {
    const chart = AppState.charts.acceleration;
    if (!chart || AppState.accelerationData.length === 0) return;

    // Prepare data for Chart.js
    const chartData = AppState.accelerationData.map(d => ({
        x: d.time / 1000, // Convert to seconds
        y: d.magnitude
    }));

    // Update chart data
    chart.data.datasets[0].data = chartData;

    // Update chart options if needed
    if (chartData.length > 0) {
        const maxTime = Math.max(...chartData.map(d => d.x));
        const maxMagnitude = Math.max(...chartData.map(d => d.y));

        chart.options.scales.x.max = Math.ceil(maxTime);
        chart.options.scales.y.max = Math.max(2.5, Math.ceil(maxMagnitude * 1.2));
    }

    // Update chart without animation for performance
    chart.update('none');
}

/**
 * Reset the acceleration chart
 */
function resetAccelerationChart() {
    const chart = AppState.charts.acceleration;
    if (chart) {
        chart.data.datasets[0].data = [];
        chart.options.scales.x.max = 10;
        chart.options.scales.y.max = 2.5;
        chart.update();
        addLog('UI', 'Acceleration chart reset');
    }
}

/**
 * Enhanced error handling wrapper for all button clicks
 */
function safeExecute(func, ...args) {
    try {
        return func(...args);
    } catch (error) {
        console.error(`Error executing ${func.name}:`, error);
        showNotification(`Error: ${error.message}`, 'error');
        addLog('Error', `${func.name}: ${error.message}`);
    }
}

/**
 * Initialize all navigation buttons with error handling
 */
function initializeNavigation() {
    // Remove inline onclick handlers and use event delegation
    const modeButtons = document.querySelectorAll('.mode-btn');

    modeButtons.forEach(btn => {
        // Extract mode from onclick attribute
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr) {
            const modeMatch = onclickAttr.match(/setMode\(['"](\w+)['"]\)/);
            if (modeMatch) {
                const mode = modeMatch[1];

                // Remove inline onclick
                btn.removeAttribute('onclick');

                // Add event listener with error handling
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    safeExecute(setMode, mode);
                });
            }
        }
    });

    // Initialize control buttons with error handling
    const buttonMappings = [
        { selector: '.start-btn[onclick="startRecording()"]', handler: startRecording },
        { selector: '.stop-btn[onclick="stopRecording()"]', handler: stopRecording },
        { selector: '.reset-btn[onclick="resetData()"]', handler: resetData },
        { selector: '.start-btn[onclick="startMultiRecording()"]', handler: startMultiRecording },
        { selector: '.stop-btn[onclick="stopMultiRecording()"]', handler: stopMultiRecording },
        { selector: '.reset-btn[onclick="generateRoom()"]', handler: generateRoom },
        { selector: '.start-btn[onclick="startSensorMonitoring()"]', handler: startSensorMonitoring },
        { selector: '.stop-btn[onclick="stopSensorMonitoring()"]', handler: stopSensorMonitoring },
        { selector: '.reset-btn[onclick="resetSensorData()"]', handler: resetSensorData },
        { selector: '.reset-btn[onclick="clearLogs()"]', handler: clearLogs },
        { selector: '.export-btn[onclick="exportLogs()"]', handler: exportLogs }
    ];

    buttonMappings.forEach(({ selector, handler }) => {
        const button = document.querySelector(selector);
        if (button && handler) {
            button.removeAttribute('onclick');
            button.addEventListener('click', (e) => {
                e.preventDefault();
                safeExecute(handler);
            });
        }
    });

    // Initialize export buttons
    const exportButtons = document.querySelectorAll('.export-btn[onclick*="exportSensorData"]');
    exportButtons.forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr) {
            const formatMatch = onclickAttr.match(/exportSensorData\(['"](\w+)['"]\)/);
            if (formatMatch) {
                const format = formatMatch[1];
                btn.removeAttribute('onclick');
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    safeExecute(exportSensorData, format);
                });
            }
        }
    });
}

// Call this function after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation with proper error handling
    setTimeout(initializeNavigation, 100);
    setAppTitle();
});

const AppState = {
    accelerationData: [],
    isRecording: false,
    startTime: null,
    animationId: null,
    currentMode: 'single',
    _roomCode: null,  // Use getter/setter pattern
    get roomCode() {
        if (!this._roomCode) {
            this._roomCode = typeof generateRoomCode === 'function' ?
                generateRoomCode() : 'TEMP';
        }
        return this._roomCode;
    },
    set roomCode(value) {
        this._roomCode = value;
    },
    connectedDevices: 1,
    sessionHistory: [],
    systemLogs: [],
    sensorData: [],
    isSensorMonitoring: false,
    sensorGraphs: {},
    previousAcceleration: { x: 0, y: 0, z: 0, timestamp: 0 },
    charts: {  // Add this
        acceleration: null
    }
};
// Application initialization
const Tittle = APP_TITLE;
document.addEventListener('DOMContentLoaded', () => {
    console.log(Tittle+' - Initializing...');

    // Initialize core systems
    initializeApplication();

    // Setup event listeners
    setupEventListeners();

    // Load saved data
    loadSavedData();

    addLog('System', Tittle+ ' ready');
    console.log('Application initialized successfully');
});

/**
 * Initialize core application systems
 */
function initializeApplication() {
    // Check device capabilities
    checkDeviceCapabilities();

    // Initialize canvas elements
    initCanvas();

    // Initialize sensor monitoring graphs
    initSensorGraphs();

    // Setup permission handling
    setupPermissions();
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
    // Window events
    window.addEventListener('beforeunload', saveApplicationState);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', debounce(handleResize, 250));

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Visibility change (for power management)
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Load saved application data
 */
function loadSavedData() {
    loadSessionHistory();
    // Assuming loadSystemLogs and loadUserPreferences exist and are correct
    // loadSystemLogs();
    // loadUserPreferences();
}

/**
 * Check device sensor capabilities
 */
function checkDeviceCapabilities() {
    const capabilities = {
        deviceMotion: 'DeviceMotionEvent' in window,
        deviceOrientation: 'DeviceOrientationEvent' in window,
        localStorage: typeof(Storage) !== "undefined"
    };

    if (!capabilities.deviceMotion) {
        showNotification('Warning: Device Motion not supported. Core features will be unavailable.', 'warning', 10000);
    }
    if (!capabilities.deviceOrientation) {
        showNotification('Warning: Device Orientation not supported. Some sensor data will be unavailable.', 'warning', 10000);
    }

    addLog('System', `Capabilities - Motion: ${capabilities.deviceMotion}, Orientation: ${capabilities.deviceOrientation}`);
    return capabilities;
}

/**
 * Setup permission requests for iOS 13+
 */
// In main.js, update setupPermissions:
function setupPermissions() {
    // For iOS 13+, attach permission request to user interactions
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        // Remove any existing listeners first
        document.querySelectorAll('.start-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // Add one-time permission request to all start buttons
        document.querySelectorAll('.start-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const permissionState = await DeviceMotionEvent.requestPermission();
                if (permissionState === 'granted') {
                    addLog('Permission', 'Motion permission granted');
                } else {
                    addLog('Permission', 'Motion permission denied');
                    showNotification('Motion permission required', 'error');
                    e.stopImmediatePropagation();
                }
            }, { once: true });
        });
    }
}
/**
 * Save application state to localStorage
 */
function saveApplicationState() {
    try {
        const state = {
            currentMode: AppState.currentMode,
            sessionHistory: AppState.sessionHistory,
            systemLogs: AppState.systemLogs
        };
        localStorage.setItem('rollAnalyzerState', JSON.stringify(state));
    } catch (e) {
        addLog('Storage Error', 'Failed to save application state.');
        console.error('Failed to save state:', e);
    }
}

/**
 * Load user preferences from localStorage
 */
function loadUserPreferences() {
    try {
        const prefs = JSON.parse(localStorage.getItem('rollAnalyzerState'));
        if (prefs && prefs.currentMode) {
            setMode(prefs.currentMode);
        }
    } catch (e) {
        addLog('System', 'No valid user preferences found.');
    }
}

/**
 * Handle window resize events
 */
function handleResize() {
    initCanvas();
    initSensorGraphs();
    if (AppState.accelerationData.length > 0) {
        drawGraph();
    }
    addLog('System', 'Window resized, re-initializing canvases.');
}

/**
 * Handle keyboard shortcuts for better accessibility
 */
function handleKeyboardShortcuts(event) {
    if (event.key === 's' && !AppState.isRecording) {
        startRecording();
    } else if (event.key === 'x' && AppState.isRecording) {
        stopRecording();
    } else if (event.key === 'r') {
        resetData();
    }
}

/**
 * Handle page visibility changes to pause/resume tasks
 */
function handleVisibilityChange() {
    if (document.hidden) {
        if (AppState.isRecording) {
            stopRecording();
            showNotification('Recording paused due to app backgrounding.', 'warning');
        }
        if (AppState.isSensorMonitoring) {
            stopSensorMonitoring();
            showNotification('Sensor monitoring paused due to app backgrounding.', 'warning');
        }
        addLog('System', 'Page hidden, pausing activities.');
    } else {
        addLog('System', 'Page visible.');
    }
}

/**
 * Handle changes in device orientation
 */
function handleOrientationChange() {
    handleResize(); // Re-initialize canvases on orientation change
    addLog('System', `Device orientation changed.`);
}

/**
 * Request permission for motion events (for iOS 13+)
 */
async function requestMotionPermission() {
    if (typeof(DeviceMotionEvent) !== "undefined" && typeof(DeviceMotionEvent.requestPermission) === "function") {
        try {
            const permissionState = await DeviceMotionEvent.requestPermission();
            if (permissionState === 'granted') {
                addLog('Permission', 'Motion permission granted.');
                return true;
            }
            addLog('Permission', 'Motion permission denied.');
            showNotification('Motion sensor access is required.', 'error');
            return false;
        } catch (error) {
            addLog('Permission Error', error.message);
            console.error(error);
            return false;
        }
    }
    return true; // Permission not required
}
// Add these functions to main.js


function setMode(mode) {
    AppState.currentMode = mode;

    // Hide all panels
    document.querySelectorAll('.main-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    // Show selected panel
    const panelId = mode + 'Mode';
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = 'block';
    }

    // Update active button
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Find the button that was clicked
    const clickedBtn = document.querySelector(`.mode-btn[onclick*="${mode}"]`);
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }

    // Trigger mode-specific actions
    if (mode === 'coach') {
        displaySessionHistory();
    } else if (mode === 'logs') {
        updateLogsDisplay();
    }

    addLog('UI', `Switched to ${mode} mode`);
}

function startMultiRecording() {
    if (AppState.isRecording) return;
    showNotification('Starting synchronized recording...', 'info');
    startRecording();
    addLog('Multi-device', `Started synchronized recording for room: ${AppState.roomCode}`);
}

function stopMultiRecording() {
    if (!AppState.isRecording) return;
    stopRecording();
    addLog('Multi-device', 'Stopped synchronized recording');
}

function generateRoom() {
    AppState.roomCode = generateRoomCode();
    const roomCodeElement = document.getElementById('roomCode');
    if (roomCodeElement) {
        roomCodeElement.textContent = AppState.roomCode;
    }
    showNotification(`New room code: ${AppState.roomCode}`, 'success');
    addLog('Multi-device', `Generated new room code: ${AppState.roomCode}`);
}
