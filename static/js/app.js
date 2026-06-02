// RoadWatch AI // Main UI & System Coordinator

// Core Application State
const AppState = {
    activeTab: 'dashboard',
    roads: [],
    complaints: []
};

// Global HUD Toast Notification system
let toastHideTimer = null;

function showToast(message, iconClass = "fa-circle-info") {
    const toast = document.getElementById('system-toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (toastHideTimer) {
        clearTimeout(toastHideTimer);
        toastHideTimer = null;
    }

    toastIcon.className = `fa-solid ${iconClass} text-cyan`;
    toastMessage.innerText = message;

    toast.classList.remove('hidden', 'toast-hiding');
    void toast.offsetWidth;
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = '';

    toastHideTimer = setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('toast-hiding');
        }, 400);
    }, 4000);
}

// Tick system clock on top HUD bar
function startHudClock() {
    const clockEl = document.getElementById('hud-clock');
    
    function updateClock() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        clockEl.innerText = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// Simulate ticking diagnostic values to make UI look alive
function runDiagnosticsTelemetry() {
    const latencyEl = document.getElementById('diag-latency');
    const aiLoadEl = document.getElementById('diag-ai-load');
    
    setInterval(() => {
        // Random latency variation 8-16ms
        const latVal = Math.floor(Math.random() * 8) + 8;
        latencyEl.innerText = `${latVal} ms`;
        
        // Random AI subcore compute times
        const cpuVal = (Math.random() * 0.05 + 0.01).toFixed(3);
        aiLoadEl.innerText = `ACTIVE // ${cpuVal}s`;
    }, 3500);
}

// Notification ticker marquee cycles
const announcementTickerMessages = [
    "AI_SUBCORE: Autonomous detection algorithms running at 60Hz. Pavement scanning ready.",
    "SYS_STATUS: Chennai municipality database securely synchronized over SQLite network.",
    "CITIZEN_ALERT: Waterlogging reported near Valasaravakkam junction. Assigned crew deployed.",
    "LEDGER: Project transparency ledger updated. Budget allocations signed at block #9014.",
    "SYSTEM_NOTIFICATION: Mount Road condition metrics logged as OPTIMAL following resurfacing."
];
let tickerIndex = 0;

function runAnnouncementTicker() {
    const tickerEl = document.getElementById('notification-ticker');

    setInterval(() => {
        tickerIndex = (tickerIndex + 1) % announcementTickerMessages.length;
        tickerEl.classList.add('ticker-fade-out');
        tickerEl.classList.remove('ticker-fade-in');

        setTimeout(() => {
            tickerEl.innerText = announcementTickerMessages[tickerIndex];
            tickerEl.classList.remove('ticker-fade-out');
            tickerEl.classList.add('ticker-fade-in');
        }, 320);
    }, 8000);
}

const TAB_SWITCH_MS = 420;

// Swapping Application Panes (Tabs)
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            if (targetTab === AppState.activeTab) return;

            const currentPane = document.querySelector('.hud-tab-pane.active');
            const targetPane = document.getElementById(`pane-${targetTab}`);

            document.querySelector('.nav-item.active').classList.remove('active');
            item.classList.add('active');

            if (currentPane && currentPane !== targetPane) {
                currentPane.classList.add('tab-leaving');
                currentPane.classList.remove('active');

                setTimeout(() => {
                    currentPane.classList.remove('tab-leaving');
                }, TAB_SWITCH_MS);
            }

            targetPane.classList.add('active');
            AppState.activeTab = targetTab;

            if (targetTab === 'map-view' && typeof map !== 'undefined') {
                setTimeout(() => map.invalidateSize(), TAB_SWITCH_MS + 80);
            }

            if (targetTab === 'dashboard' && typeof refreshDashboardTelemetry === 'function') {
                const grid = document.querySelector('#pane-dashboard .dashboard-grid');
                if (grid) {
                    grid.classList.add('dashboard-refresh');
                    setTimeout(() => grid.classList.remove('dashboard-refresh'), 700);
                }
            }

            showToast(`Switched terminal context to: ${targetTab.toUpperCase()}`);
        });
    });
}

// Load Initial Data from endpoints
function loadInitialSystemData() {
    Promise.all([
        fetch('/api/roads').then(r => r.json()),
        fetch('/api/complaints').then(r => r.json())
    ])
    .then(([roadsData, complaintsData]) => {
        if (roadsData.status === 'success' && complaintsData.status === 'success') {
            AppState.roads = roadsData.roads;
            AppState.complaints = complaintsData.complaints;
            
            // 1. Initialize Dashboard Charts & Metrics
            if (typeof populateDashboardMetrics === 'function') {
                populateDashboardMetrics(AppState.roads, AppState.complaints);
            }
            if (typeof initDashboardCharts === 'function') {
                initDashboardCharts(AppState.roads, AppState.complaints);
            }
            if (typeof renderInfrastructureRegistryTable === 'function') {
                renderInfrastructureRegistryTable(AppState.roads);
            }
            
            // 2. Initialize Leaflet Maps
            if (typeof initTelemetryMap === 'function') {
                initTelemetryMap();
            }
        }
    })
    .catch(err => {
        console.error("Critical: Telemetry init failed:", err);
        showToast("Error establishing connection to subcore API.", "fa-triangle-exclamation");
    });
}

// Document Load entrypoint
window.addEventListener('DOMContentLoaded', () => {
    const tickerEl = document.getElementById('notification-ticker');
    if (tickerEl) tickerEl.classList.add('ticker-fade-in');

    startHudClock();
    runDiagnosticsTelemetry();
    runAnnouncementTicker();
    setupNavigation();
    loadInitialSystemData();
});
