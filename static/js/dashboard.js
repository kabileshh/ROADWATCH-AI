// RoadWatch AI // Transparency Analytics Dashboard Module (Chart.js)

let complaintsChartInstance = null;
let budgetChartInstance = null;

// Initialize Analytics Charts
function initDashboardCharts(roads, complaints) {
    // 1. Process Complaints categories count
    const categories = { 'Pothole': 0, 'Crack': 0, 'Waterlogging': 0, 'Other': 0 };
    complaints.forEach(c => {
        const type = c.damage_type || 'Other';
        if (categories.hasOwnProperty(type)) {
            categories[type]++;
        } else {
            categories['Other']++;
        }
    });

    const categoryLabels = Object.keys(categories);
    const categoryValues = Object.values(categories);

    // Render Complaints Bar Chart
    const ctxBar = document.getElementById('complaintsChart').getContext('2d');
    
    // Neon Gradient fill
    const barGradient = ctxBar.createLinearGradient(0, 0, 0, 250);
    barGradient.addColorStop(0, 'rgba(0, 180, 216, 0.5)');
    barGradient.addColorStop(1, 'rgba(0, 180, 216, 0.03)');

    if (complaintsChartInstance) {
        complaintsChartInstance.destroy();
    }

    complaintsChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: categoryLabels,
            datasets: [{
                label: 'Logged Anomalies',
                data: categoryValues,
                backgroundColor: barGradient,
                borderColor: '#00b4d8',
                borderWidth: 2,
                borderRadius: 4,
                hoverBackgroundColor: 'rgba(0, 180, 216, 0.8)',
                barPercentage: 0.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 900,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(4, 8, 16, 0.95)',
                    titleFont: { family: 'Outfit', size: 12 },
                    bodyFont: { family: 'Share Tech Mono', size: 12 },
                    borderColor: 'rgba(0, 180, 216, 0.3)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#7f8ea3', font: { family: 'Rajdhani', size: 12 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { 
                        color: '#7f8ea3', 
                        font: { family: 'Share Tech Mono', size: 11 },
                        stepSize: 1
                    },
                    beginAtZero: true
                }
            }
        }
    });

    // 2. Process Budget per Road segment
    const roadNames = roads.map(r => r.name);
    const roadBudgets = roads.map(r => r.budget);

    const ctxPie = document.getElementById('budgetChart').getContext('2d');

    if (budgetChartInstance) {
        budgetChartInstance.destroy();
    }

    budgetChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: roadNames,
            datasets: [{
                data: roadBudgets,
                backgroundColor: [
                    'rgba(0, 180, 216, 0.65)',
                    'rgba(255, 140, 0, 0.65)',
                    'rgba(0, 230, 118, 0.65)',
                    'rgba(255, 23, 68, 0.65)',
                    'rgba(255, 214, 0, 0.65)',
                    'rgba(186, 104, 200, 0.65)'
                ],
                borderColor: '#040810',
                borderWidth: 2,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#7f8ea3',
                        font: { family: 'Outfit', size: 10 },
                        padding: 10,
                        boxWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(4, 8, 16, 0.95)',
                    titleFont: { family: 'Outfit', size: 12 },
                    bodyFont: { family: 'Share Tech Mono', size: 12 },
                    borderColor: 'rgba(255, 140, 0, 0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return ` Budget: ₹${context.raw.toLocaleString('en-IN')}`;
                        }
                    }
                }
            }
        }
    });
}

// Recalculate and count up statistic counter values
function populateDashboardMetrics(roads, complaints) {
    // 1. Average Health
    const avgHealth = roads.length > 0 
        ? Math.round(roads.reduce((sum, r) => sum + r.health_score, 0) / roads.length)
        : 100;
    
    animateNumberCounter('dash-avg-health', avgHealth, '%');

    // 2. Total Complaints
    animateNumberCounter('dash-total-complaints', complaints.length, '');

    // 3. Pending/Dispatched count
    const activeDispatchCount = complaints.filter(c => c.status !== 'Resolved').length;
    document.getElementById('dash-pending-routing').innerText = `${activeDispatchCount} in dispatch routing`;

    // 4. Budget transparency spent vs allocated
    const totalBudget = roads.reduce((sum, r) => sum + r.budget, 0);
    const totalSpent = roads.reduce((sum, r) => sum + r.spent, 0);
    const utilPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    
    animateNumberCounter('dash-budget-util', utilPercent, '%');
    document.getElementById('dash-total-budget').innerText = `Allocated: ₹${(totalBudget/10000000).toFixed(2)} Cr`;
}

// Kinetic counting animation (ease-out via requestAnimationFrame)
function animateNumberCounter(elementId, targetVal, suffix = "") {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (el._counterRaf) {
        cancelAnimationFrame(el._counterRaf);
    }

    const startVal = parseInt(String(el.innerText).replace(/[^\d]/g, ''), 10);
    const from = Number.isFinite(startVal) ? startVal : 0;
    const duration = 1100;
    const startTime = performance.now();

    el.classList.add('counting');

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = easeOutCubic(progress);
        const current = Math.round(from + (targetVal - from) * eased);
        el.innerText = `${current}${suffix}`;

        if (progress < 1) {
            el._counterRaf = requestAnimationFrame(tick);
        } else {
            el.innerText = `${targetVal}${suffix}`;
            el.classList.remove('counting');
            el._counterRaf = null;
        }
    }

    if (targetVal === 0) {
        el.innerText = `0${suffix}`;
        el.classList.remove('counting');
        return;
    }

    el._counterRaf = requestAnimationFrame(tick);
}

// Populate the HTML Infrastructure Registry Table
function renderInfrastructureRegistryTable(roads) {
    const tbody = document.getElementById('dashboard-roads-tbody');
    tbody.innerHTML = '';

    roads.forEach((road, index) => {
        const tr = document.createElement('tr');

        let healthColor = 'text-green';
        if (road.health_score < 40) {
            healthColor = 'text-red';
        } else if (road.health_score < 75) {
            healthColor = 'text-yellow';
        }

        tr.className = 'row-enter';
        tr.style.animationDelay = `${0.04 + index * 0.045}s`;

        tr.innerHTML = `
            <td><b class="text-cyan">${road.name}</b></td>
            <td>${road.contractor}</td>
            <td>₹${road.budget.toLocaleString('en-IN')}</td>
            <td>₹${road.spent.toLocaleString('en-IN')}</td>
            <td><span class="${healthColor}" style="font-family: var(--font-heading); font-size:1.1rem; font-weight:bold;">${road.health_score}%</span></td>
            <td><span class="status-pill status-${road.condition.toLowerCase()}">${road.condition.toUpperCase()}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Master refresh dashboard method called after complaints log submissions
function refreshDashboardTelemetry() {
    // Sync data and update charts/metrics
    Promise.all([
        fetch('/api/roads').then(r => r.json()),
        fetch('/api/complaints').then(r => r.json())
    ])
    .then(([roadsData, complaintsData]) => {
        if (roadsData.status === 'success' && complaintsData.status === 'success') {
            const roads = roadsData.roads;
            const complaints = complaintsData.complaints;
            
            const grid = document.querySelector('#pane-dashboard .dashboard-grid');
            if (grid) {
                grid.classList.add('dashboard-refresh');
                setTimeout(() => grid.classList.remove('dashboard-refresh'), 700);
            }

            populateDashboardMetrics(roads, complaints);
            initDashboardCharts(roads, complaints);
            renderInfrastructureRegistryTable(roads);
        }
    })
    .catch(err => console.error("Error refreshing dashboard dashboard:", err));
}
