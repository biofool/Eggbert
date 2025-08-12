// UI Management - js/ui.js

// Store chart instance in the AppState
AppState.charts = {
    acceleration: null
};

/**
 * Initialize the main acceleration chart using Chart.js
 */
function initAccelerationChart() {
    const canvas = document.getElementById('accelerationGraph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Destroy previous chart instance if it exists
    if (AppState.charts.acceleration) {
        AppState.charts.acceleration.destroy();
    }

    AppState.charts.acceleration = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'G-Force Magnitude',
                data: [],
                borderColor: 'rgba(102, 126, 234, 1)',
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Time (s)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Acceleration (G)'
                    },
                    suggestedMin: 0,
                    suggestedMax: 2.5
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                }
            },
            animation: {
                duration: 0 // Disable animation for real-time updates
            }
        }
    });
    addLog('UI', 'Acceleration chart initialized.');
}

/**
 * Update the acceleration chart with new data during recording.
 */
function updateAccelerationChart() {
    const chart = AppState.charts.acceleration;
    if (!chart || AppState.accelerationData.length === 0) return;

    const labels = AppState.accelerationData.map(d => (d.time / 1000).toFixed(2));
    const data = AppState.accelerationData.map(d => d.magnitude);

    chart.data.labels = labels;
    chart.data.datasets[0].data = data;

    chart.update();
}

/**
 * Reset the acceleration chart to its initial state.
 */
function resetAccelerationChart() {
    const chart = AppState.charts.acceleration;
    if (chart) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        addLog('UI', 'Acceleration chart reset.');
    }
}

// Replace the old initCanvas function call in main.js with this one.
// We'll call this when the DOM is loaded.
document.addEventListener('DOMContentLoaded', initAccelerationChart);


/**
 * Create and show notification
 */
function showNotification(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<i class="fas fa-${getNotificationIcon(type)}"></i><span>${message}</span>`;

    if (!document.getElementById('notification-styles')) {
        addNotificationStyles();
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
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
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 20px;
            border-radius: 25px;
            background-color: #333;
            color: white;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 1001;
            opacity: 0;
            transition: opacity 0.5s, bottom 0.5s;
        }
        .notification.show {
            opacity: 1;
            bottom: 30px;
        }
        .notification-success { background-color: var(--success-color); }
        .notification-warning { background-color: var(--warning-color); color: var(--black); }
        .notification-error { background-color: var(--error-color); }
        .notification-info { background-color: var(--info-color); }
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
 * Update the score display circle and text with animation.
 */
function updateScoreDisplay(score) {
    const scoreElement = document.getElementById('overallScore');
    const circleElement = document.getElementById('scoreCircle');

    if (scoreElement) {
        animateValue(scoreElement, 0, score, 1000);
    }

    if (circleElement) {
        const circumference = 2 * Math.PI * parseFloat(circleElement.getAttribute('r'));
        const targetOffset = circumference - (score / 100) * circumference;

        // Animate the circle
        circleElement.style.transition = 'stroke-dashoffset 1s ease-out';
        circleElement.style.strokeDashoffset = targetOffset;

        if (score >= 80) circleElement.style.stroke = 'var(--success-color)';
        else if (score >= 60) circleElement.style.stroke = 'var(--warning-color)';
        else circleElement.style.stroke = 'var(--error-color)';
    }
}

/**
 * Animate a numeric value in a DOM element.
 */
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
