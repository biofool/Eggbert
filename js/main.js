// Main Application Logic - js/main.js

// // Global application state
// const AppState = {
//     accelerationData: [],
//     isRecording: false,
//     startTime: null,
//     animationId: null,
//     currentMode: 'single',
//     roomCode: generateRoomCode(),
//     connectedDevices: 1,
//     sessionHistory: [],
//     systemLogs: [],
//     sensorData: [],
//     isSensorMonitoring: false,
//     sensorGraphs: {},
//     previousAcceleration: { x: 0, y: 0, z: 0, timestamp: 0 }
// };
// In main.js, update the AppState object:
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('Roll Smoothness Analyzer - Initializing...');

    // Initialize core systems
    initializeApplication();

    // Setup event listeners
    setupEventListeners();

    // Load saved data
    loadSavedData();

    addLog('System', 'Roll Smoothness Analyzer ready');
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
function setupPermissions() {
    const requestPermission = () => {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        addLog('Permission', 'DeviceMotionEvent permission granted.');
                    } else {
                        addLog('Permission', 'DeviceMotionEvent permission denied.');
                        showNotification('Motion sensor access is required for the app to function.', 'error');
                    }
                })
                .catch(error => {
                    addLog('Permission Error', error.message);
                    console.error(error);
                });
        }
    };
    // Add a listener to a user-initiated event, like a button click
    // For simplicity, we'll add it to the start button itself in the HTML or via another script.
    // Example: document.querySelector('.start-btn').addEventListener('click', requestPermission, { once: true });
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

function initCanvas() {
    initAccelerationChart();
}

function drawGraph() {
    updateAccelerationChart();
}

function animate() {
    if (AppState.isRecording) {
        updateAccelerationChart();
        AppState.animationId = requestAnimationFrame(animate);
    }
}

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
