// Main Application Logic - js/main.js

// Global application state
const AppState = {
    accelerationData: [],
    isRecording: false,
    startTime: null,
    animationId: null,
    currentMode: 'single',
    roomCode: generateRoomCode(),
    connectedDevices: 1,
    sessionHistory: [],
    systemLogs: [],
    sensorData: [],
    isSensorMonitoring: false,
    sensorGraphs: {},
    previousAcceleration: { x: 0, y: 0, z: 0 }
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
    
    addLog('System initialized', 'Roll Smoothness Analyzer ready');
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
    
    // Initialize sensor monitoring
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
    window.addEventListener('resize', _.debounce(handleResize, 250));
    
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
    loadSystemLogs();
    loadUserPreferences();
}

/**
 * Check device sensor capabilities
 */
function checkDeviceCapabilities() {
    const capabilities = {
        deviceMotion: 'DeviceMotionEvent' in window,
        deviceOrientation: '
