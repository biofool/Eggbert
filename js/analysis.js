// Roll Analysis Logic - js/analysis.js

/**
 * Start recording roll data
 */
function startRecording() {
    if (AppState.isRecording) return;

    // Request permissions first
    requestMotionPermission().then(granted => {
        if (!granted) return;

        AppState.isRecording = true;
        AppState.accelerationData = [];
        AppState.startTime = Date.now();

        // Update UI
        updateRecordingUI(true);

        // Start listening to accelerometer
        window.addEventListener('devicemotion', handleMotionRecording);

        // Auto-stop after 10 seconds
        setTimeout(() => {
            if (AppState.isRecording) {
                stopRecording();
            }
        }, 10000);

        // Start animation
        animate();

        addLog('Recording', 'Roll analysis recording started');
        showNotification('Recording started - perform your roll!', 'success');
    });
}

/**
 * Stop recording roll data
 */
function stopRecording() {
    if (!AppState.isRecording) return;

    AppState.isRecording = false;

    // Update UI
    updateRecordingUI(false);

    // Stop listening
    window.removeEventListener('devicemotion', handleMotionRecording);

    // Cancel animation
    if (AppState.animationId) {
        cancelAnimationFrame(AppState.animationId);
        AppState.animationId = null;
    }

    // Analyze collected data
    analyzeRoll();

    addLog('Recording', `Recording stopped. Collected ${AppState.accelerationData.length} data points`);
}

/**
 * Update UI during recording state changes
 */
function updateRecordingUI(isRecording) {
    const status = document.getElementById('status');
    const startBtn = document.querySelector('.start-btn');
    const stopBtn = document.querySelector('.stop-btn');

    if (status) {
        status.textContent = isRecording ? 'Recording' : 'Processing';
        status.className = `status-badge ${isRecording ? 'status-recording' : 'status-waiting'}`;
    }

    if (startBtn) startBtn.disabled = isRecording;
    if (stopBtn) stopBtn.disabled = !isRecording;
}

/**
 * Handle motion events during recording
 */
function handleMotionRecording(event) {
    if (!AppState.isRecording || !event.accelerationIncludingGravity) return;

    const acc = event.accelerationIncludingGravity;
    const timestamp = Date.now() - AppState.startTime;

    // Convert to G and store
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z) / 9.81;

    AppState.accelerationData.push({
        time: timestamp,
        x: acc.x / 9.81,
        y: acc.y / 9.81,
        z: acc.z / 9.81,
        magnitude: magnitude,
        rawMagnitude: Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z)
    });
}

/**
 * Analyze collected roll data
 */
function analyzeRoll() {
    if (AppState.accelerationData.length < 10) {
        addLog('Analysis error', 'Insufficient data for analysis');
        showNotification('Not enough data collected. Please try again.', 'error');
        resetData();
        return;
    }

    // Calculate core metrics
    const metrics = calculateRollMetrics();

    // Calculate overall score
    const score = calculateOverallScore(metrics);

    // Update UI with results
    updateMetricsDisplay(metrics);
    updateScoreDisplay(score);

    // Save session
    saveSession({
        timestamp: new Date().toISOString(),
        score: score,
        metrics: {
            peakForce: metrics.peakForce.toFixed(2),
            smoothness: Math.round(metrics.smoothness),
            rollTime: metrics.rollTime.toFixed(2),
            jerkIndex: metrics.avgJerk.toFixed(1)
        },
        rawData: AppState.accelerationData
    });

    // Draw final graph
    drawGraph();

    // Update status
    const status = document.getElementById('status');
    if (status) {
        status.textContent = 'Complete';
        status.className = 'status-badge status-ready';
    }

    addLog('Analysis', `Complete - Score: ${score}, Peak: ${metrics.peakForce.toFixed(2)}G, Time: ${metrics.rollTime.toFixed(2)}s`);
    showNotification(`Analysis complete! Score: ${score}`, 'success');
}

/**
 * Calculate roll performance metrics
 */
function calculateRollMetrics() {
    const data = AppState.accelerationData;

    // Basic metrics
    const peakForce = Math.max(...data.map(d => d.magnitude));
    const avgForce = data.reduce((sum, d) => sum + d.magnitude, 0) / data.length;
    const rollTime = (data[data.length - 1].time - data[0].time) / 1000;

    // Calculate jerk (rate of change of acceleration)
    let totalJerk = 0;
    let jerkCount = 0;

    for (let i = 1; i < data.length; i++) {
        const dt = (data[i].time - data[i-1].time) / 1000;
        if (dt > 0) {
            const jerk = Math.abs(data[i].magnitude - data[i-1].magnitude) / dt;
            totalJerk += jerk;
            jerkCount++;
        }
    }

    const avgJerk = jerkCount > 0 ? totalJerk / jerkCount : 0;

    // Calculate smoothness score (inverse of jerk, normalized)
    const maxAcceptableJerk = 50; // m/s³
    const smoothness = Math.max(0, Math.min(100, 100 * (1 - avgJerk / maxAcceptableJerk)));

    // Advanced metrics
    const motionVariability = calculateMotionVariability(data);
    const peakDetection = analyzePeaks(data);
    const stabilityIndex = calculateStabilityIndex(data);

    return {
        peakForce,
        avgForce,
        rollTime,
        avgJerk,
        smoothness,
        motionVariability,
        peakDetection,
        stabilityIndex
    };
}

/**
 * Calculate motion variability
 */
function calculateMotionVariability(data) {
    const magnitudes = data.map(d => d.magnitude);
    const mean = magnitudes.reduce((sum, val) => sum + val, 0) / magnitudes.length;
    const variance = magnitudes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / magnitudes.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = (standardDeviation / mean) * 100;

    return {
        mean,
        standardDeviation,
        coefficientOfVariation,
        range: Math.max(...magnitudes) - Math.min(...magnitudes)
    };
}

/**
 * Analyze peaks in the motion data
 */
function analyzePeaks(data) {
    const magnitudes = data.map(d => d.magnitude);
    const peaks = detectPeaks(magnitudes, 1.2, 10); // Threshold 1.2G, min distance 10 samples

    const peakTimes = peaks.map(peak => data[peak.index].time);
    const peakIntervals = [];

    for (let i = 1; i < peakTimes.length; i++) {
        peakIntervals.push(peakTimes[i] - peakTimes[i-1]);
    }

    const avgInterval = peakIntervals.length > 0 ?
        peakIntervals.reduce((sum, interval) => sum + interval, 0) / peakIntervals.length : 0;

    return {
        count: peaks.length,
        avgInterval,
        peakTimes,
        rhythmConsistency: calculateRhythmConsistency(peakIntervals)
    };
}

/**
 * Calculate rhythm consistency from peak intervals
 */
function calculateRhythmConsistency(intervals) {
    if (intervals.length < 2) return 100;

    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;

    // Convert to consistency score (lower CV = higher consistency)
    return Math.max(0, 100 - cv);
}

/**
 * Calculate stability index
 */
function calculateStabilityIndex(data) {
    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);
    const zValues = data.map(d => d.z);

    const xStability = calculateAxisStability(xValues);
    const yStability = calculateAxisStability(yValues);
    const zStability = calculateAxisStability(zValues);

    return {
        x: xStability,
        y: yStability,
        z: zStability,
        overall: (xStability + yStability + zStability) / 3
    };
}

/**
 * Calculate stability for a single axis
 */
function calculateAxisStability(values) {
    const smoothedValues = movingAverage(values, 5);
    const differences = [];

    for (let i = 1; i < smoothedValues.length; i++) {
        differences.push(Math.abs(smoothedValues[i] - smoothedValues[i-1]));
    }

    const avgDifference = differences.reduce((sum, val) => sum + val, 0) / differences.length;

    // Convert to stability score (lower difference = higher stability)
    return Math.max(0, 100 - (avgDifference * 50));
}

/**
 * Calculate overall performance score
 */
function calculateOverallScore(metrics) {
    // Individual component scores
    const peakScore = calculatePeakScore(metrics.peakForce);
    const smoothnessScore = metrics.smoothness;
    const timeScore = calculateTimeScore(metrics.rollTime);
    const stabilityScore = metrics.stabilityIndex.overall;
    const rhythmScore = metrics.peakDetection.rhythmConsistency;

    // Weighted average
    const weightedScore = (
        peakScore * 0.25 +           // 25% - optimal force application
        smoothnessScore * 0.30 +      // 30% - movement smoothness
        timeScore * 0.15 +            // 15% - timing
        stabilityScore * 0.20 +       // 20% - stability
        rhythmScore * 0.10            // 10% - rhythm consistency
    );

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
}

/**
 * Calculate peak force score
 */
function calculatePeakScore(peakForce) {
    // Ideal peak force range: 1.2G - 2.0G
    const idealMin = 1.2;
    const idealMax = 2.0;

    if (peakForce >= idealMin && peakForce <= idealMax) {
        return 100;
    } else if (peakForce < idealMin) {
        // Too gentle
        return Math.max(0, 100 - ((idealMin - peakForce) * 60));
    } else {
        // Too forceful
        return Math.max(0, 100 - ((peakForce - idealMax) * 40));
    }
}

/**
 * Calculate timing score
 */
function calculateTimeScore(rollTime) {
    // Ideal roll time: 1.0 - 2.5 seconds
    const idealMin = 1.0;
    const idealMax = 2.5;

    if (rollTime >= idealMin && rollTime <= idealMax) {
        return 100;
    } else if (rollTime < idealMin) {
        // Too fast
        return Math.max(0, 100 - ((idealMin - rollTime) * 50));
    } else {
        // Too slow
        return Math.max(0, 100 - ((rollTime - idealMax) * 30));
    }
}

/**
 * Update metrics display in UI
 */
function updateMetricsDisplay(metrics) {
    const updates = [
        { id: 'peakForce', value: metrics.peakForce.toFixed(2) },
        { id: 'smoothness', value: Math.round(metrics.smoothness) },
        { id: 'rollTime', value: metrics.rollTime.toFixed(2) },
        { id: 'jerkIndex', value: metrics.avgJerk.toFixed(1) }
    ];

    updates.forEach(update => {
        const element = document.getElementById(update.id);
        if (element) {
            element.textContent = update.value;
        }
    });
}

/**
 * Update score display with animation
 */
function updateScoreDisplay(score) {
    const scoreElement = document.getElementById('overallScore');
    const circleElement = document.getElementById('scoreCircle');

    if (scoreElement) {
        // Animate score counting up
        animateScoreCounter(scoreElement, score);
    }

    if (circleElement) {
        // Animate score circle
        animateScoreCircle(circleElement, score);
    }
}

/**
 * Animate score counter
 */
function animateScoreCounter(element, targetScore) {
    let currentScore = 0;
    const increment = targetScore / 30; // 30 frames

    const counter = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(counter);
        }
        element.textContent = Math.round(currentScore);
    }, 50);
}

/**
 * Animate score circle
 */
function animateScoreCircle(element, score) {
    const circumference = 2 * Math.PI * 65; // radius = 65
    const targetOffset = circumference - (score / 100) * circumference;

    // Set initial state
    element.style.strokeDashoffset = circumference;

    // Animate to target
    let currentOffset = circumference;
    const step = (circumference - targetOffset) / 60; // 60 frames

    const animation = setInterval(() => {
        currentOffset -= step;
        if (currentOffset <= targetOffset) {
            currentOffset = targetOffset;
            clearInterval(animation);
        }
        element.style.strokeDashoffset = currentOffset;
    }, 16); // ~60fps

    // Set color based on score
    if (score >= 80) {
        element.style.stroke = '#4caf50'; // Green
    } else if (score >= 60) {
        element.style.stroke = '#ffc107'; // Yellow
    } else {
        element.style.stroke = '#f44336'; // Red
    }
}

/**
 * Reset all data and UI
 */
function resetData() {
    // Stop any ongoing operations
    if (AppState.isRecording) {
        stopRecording();
    }

    AppState.accelerationData = [];

    // Reset UI elements
    const status = document.getElementById('status');
    if (status) {
        status.textContent = 'Ready';
        status.className = 'status-badge status-waiting';
    }

    const startBtn = document.querySelector('.start-btn');
    const stopBtn = document.querySelector('.stop-btn');
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    // Reset metrics
    const metricResets = [
        { id: 'peakForce', value: '0' },
        { id: 'smoothness', value: '--' },
        { id: 'rollTime', value: '0' },
        { id: 'jerkIndex', value: '0' },
        { id: 'overallScore', value: '--' }
    ];

    metricResets.forEach(reset => {
        const element = document.getElementById(reset.id);
        if (element) {
            element.textContent = reset.value;
        }
    });

    // Reset score circle
    const circleElement = document.getElementById('scoreCircle');
    if (circleElement) {
        circleElement.style.strokeDashoffset = '408';
        circleElement.style.stroke = '#4caf50';
    }

    // Clear graph
    initCanvas();

    addLog('Reset', 'All measurement data has been reset');
    showNotification('Data reset complete', 'success');
}

/**
 * Save session to history
 */
function saveSession(session) {
    AppState.sessionHistory.unshift(session);

    // Keep only last 50 sessions
    if (AppState.sessionHistory.length > 50) {
        AppState.sessionHistory = AppState.sessionHistory.slice(0, 50);
    }

    // Save to localStorage
    try {
        localStorage.setItem('rollHistory', JSON.stringify(AppState.sessionHistory));
        addLog('Session', `Score: ${session.score} saved to history`);
    } catch (error) {
        addLog('Storage error', 'Failed to save session to localStorage');
        console.error('Failed to save session:', error);
    }
}

/**
 * Load session history from localStorage
 */
function loadSessionHistory() {
    try {
        const saved = localStorage.getItem('rollHistory');
        if (saved) {
            AppState.sessionHistory = JSON.parse(saved);
            addLog('History', `Loaded ${AppState.sessionHistory.length} previous sessions`);
        }
    } catch (error) {
        addLog('Storage error', 'Failed to load session history');
        console.error('Failed to load session history:', error);
        AppState.sessionHistory = [];
    }
}

/**
 * Display session history in coach view
 */
function displaySessionHistory() {
    const container = document.getElementById('sessionHistory');
    if (!container) return;

    if (AppState.sessionHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line fa-3x" style="color: #ccc; margin-bottom: 20px;"></i>
                <h3 style="color: #999; margin-bottom: 10px;">No Sessions Yet</h3>
                <p style="color: #666;">Complete some roll analyses to see your progress here</p>
            </div>
        `;
        return;
    }

    // Create table
    let html = `
        <div style="overflow-x: auto;">
            <table class="session-table">
                <thead>
                    <tr>
                        <th><i class="fas fa-calendar"></i> Date/Time</th>
                        <th><i class="fas fa-star"></i> Score</th>
                        <th><i class="fas fa-bolt"></i> Peak G</th>
                        <th><i class="fas fa-wave-square"></i> Smoothness</th>
                        <th><i class="fas fa-clock"></i> Time</th>
                        <th><i class="fas fa-chart-area"></i> Jerk</th>
                    </tr>
                </thead>
                <tbody>
    `;

    AppState.sessionHistory.forEach((session, index) => {
        const date = new Date(session.timestamp);
        const scoreColor = getScoreColor(session.score);
        const isRecent = index < 3; // Highlight recent sessions

        html += `
            <tr class="${isRecent ? 'recent-session' : ''}">
                <td>
                    <div style="font-weight: 500;">${date.toLocaleDateString()}</div>
                    <div style="font-size: 0.8em; color: #666;">${date.toLocaleTimeString()}</div>
                </td>
                <td class="score-cell" style="color: ${scoreColor};">
                    <span style="font-size: 1.2em;">${session.score}</span>
                    <div style="font-size: 0.7em; opacity: 0.8;">
                        ${getScoreGrade(session.score)}
                    </div>
                </td>
                <td class="metric-cell">${session.metrics.peakForce}G</td>
                <td class="metric-cell">${session.metrics.smoothness}%</td>
                <td class="metric-cell">${session.metrics.rollTime}s</td>
                <td class="metric-cell">${session.metrics.jerkIndex}</td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';

    // Add statistics
    const stats = calculateHistoryStatistics();
    html += `
        <div class="history-stats">
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="stat-value">${stats.averageScore}</div>
                    <div class="stat-label">Average Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-trophy"></i></div>
                    <div class="stat-value">${stats.bestScore}</div>
                    <div class="stat-label">Best Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-trending-up"></i></div>
                    <div class="stat-value">${stats.improvement}</div>
                    <div class="stat-label">Improvement</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-value">${stats.totalSessions}</div>
                    <div class="stat-label">Total Sessions</div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Get color based on score
 */
function getScoreColor(score) {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ffc107';
    if (score >= 40) return '#ff9800';
    return '#f44336';
}

/**
 * Get letter grade based on score
 */
function getScoreGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}

/**
 * Calculate statistics from session history
 */
function calculateHistoryStatistics() {
    if (AppState.sessionHistory.length === 0) {
        return {
            averageScore: 0,
            bestScore: 0,
            improvement: 0,
            totalSessions: 0
        };
    }

    const scores = AppState.sessionHistory.map(s => s.score);
    const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const bestScore = Math.max(...scores);

    // Calculate improvement (comparing recent vs older sessions)
    let improvement = 0;
    if (AppState.sessionHistory.length >= 6) {
        const recentAvg = scores.slice(0, 3).reduce((sum, score) => sum + score, 0) / 3;
        const olderAvg = scores.slice(-3).reduce((sum, score) => sum + score, 0) / 3;
        improvement = Math.round(recentAvg - olderAvg);
    }

    return {
        averageScore,
        bestScore,
        improvement: improvement > 0 ? `+${improvement}` : improvement.toString(),
        totalSessions: AppState.sessionHistory.length
    };
}