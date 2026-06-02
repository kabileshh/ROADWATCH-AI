// RoadWatch AI // Interactive Map Module (Leaflet.js & OpenStreetMap)

let map;
let roadLayers = [];
let complaintMarkers = [];
let temporaryPin = null;
let activeHighlightLayer = null;

// Initialize telemetry map
function initTelemetryMap() {
    // Chennai Center coordinates
    map = L.map('map', {
        center: [13.0450, 80.2300],
        zoom: 13,
        zoomControl: true,
        maxZoom: 18,
        minZoom: 11
    });

    // Load OpenStreetMap tiles - dark filter is applied in main.css via tile container
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'RoadWatch AI Telemetry &copy; OpenStreetMap'
    }).addTo(map);

    // Double-click sets telemetry marker pin
    map.doubleClickZoom.disable();
    map.on('dblclick', function(e) {
        setTemporaryPin(e.latlng.lat, e.latlng.lng);
    });

    // Initial Telemetry Sync
    syncTelemetryData();
}

// Set temporary pin on double click
function setTemporaryPin(lat, lng) {
    if (temporaryPin) {
        map.removeLayer(temporaryPin);
    }

    const orangePulsingIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="map-pulse-marker bg-orange"><div class="pulse-ring"></div></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    temporaryPin = L.marker([lat, lng], { icon: orangePulsingIcon }).addTo(map);
    temporaryPin.bindPopup(`
        <div class="glass-popup">
            <span class="popup-title">COORDINATE PIN LOCKED</span>
            <p>Lat: ${lat.toFixed(6)}</p>
            <p>Lng: ${lng.toFixed(6)}</p>
            <span class="popup-sub">Assigned to Anomaly Form</span>
        </div>
    `).openPopup();

    // Fill form details
    document.getElementById('report-lat').value = lat.toFixed(6);
    document.getElementById('report-lng').value = lng.toFixed(6);

    // Prompt user via Toast
    showToast(`Telemetry pin locked: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
}

// Sync roads and complaints from Flask endpoints
function syncTelemetryData() {
    // 1. Fetch Roads
    fetch('/api/roads')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                renderRoadSegments(data.roads);
            }
        })
        .catch(err => console.error("Error syncing roads:", err));

    // 2. Fetch Complaints
    fetch('/api/complaints')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                renderComplaintMarkers(data.complaints);
            }
        })
        .catch(err => console.error("Error syncing complaints:", err));
}

// Render road paths as color-coded lines
function renderRoadSegments(roads) {
    // Clear existing
    roadLayers.forEach(l => map.removeLayer(l));
    roadLayers = [];

    roads.forEach(road => {
        const coords = road.coordinates;
        if (!coords || coords.length < 2) return;

        // Choose color based on condition
        let strokeColor = 'var(--health-optimal)';
        if (road.condition === 'Critical') {
            strokeColor = 'var(--health-critical)';
        } else if (road.condition === 'Fair') {
            strokeColor = 'var(--health-fair)';
        }

        // Draw polyline
        const polyline = L.polyline(coords, {
            color: strokeColor,
            weight: 6,
            opacity: 0.85,
            lineJoin: 'round'
        }).addTo(map);

        // Bind references to road data
        polyline.roadData = road;

        // Visual Interaction Hover states
        polyline.on('mouseover', function(e) {
            polyline.setStyle({
                weight: 9,
                opacity: 1.0
            });
        });

        polyline.on('mouseout', function(e) {
            polyline.setStyle({
                weight: 6,
                opacity: 0.85
            });
        });

        polyline.on('click', function(e) {
            selectRoadway(road, polyline);
        });

        roadLayers.push(polyline);
    });
}

// Select a road, show its details in right panel and highlight on map
function selectRoadway(road, polylineLayer) {
    // Highlight segment
    if (activeHighlightLayer) {
        map.removeLayer(activeHighlightLayer);
    }

    activeHighlightLayer = L.polyline(polylineLayer.getLatLngs(), {
        color: 'var(--neon-orange)',
        weight: 10,
        opacity: 0.9,
        dashArray: '5, 10',
        lineJoin: 'round'
    }).addTo(map);

    // Update Drawer UI
    document.getElementById('road-detail-placeholder').classList.add('hidden');
    
    const content = document.getElementById('road-detail-content');
    content.classList.remove('hidden');

    document.getElementById('detail-road-name').innerText = road.name;
    document.getElementById('detail-contractor').innerText = road.contractor;
    document.getElementById('detail-budget').innerText = `₹${road.budget.toLocaleString('en-IN')}`;
    document.getElementById('detail-spent').innerText = `₹${road.spent.toLocaleString('en-IN')}`;
    document.getElementById('detail-repair-date').innerText = road.last_repair_date;

    const healthVal = document.getElementById('detail-health');
    healthVal.innerText = `${road.health_score}%`;
    
    // Health colors
    healthVal.className = 'detail-value text-large';
    if (road.health_score < 40) {
        healthVal.classList.add('text-red');
    } else if (road.health_score < 75) {
        healthVal.classList.add('text-yellow');
    } else {
        healthVal.classList.add('text-cyan');
    }

    const condPill = document.getElementById('detail-condition');
    condPill.innerText = road.condition.toUpperCase();
    condPill.className = 'detail-value status-pill';
    condPill.classList.add(`status-${road.condition.toLowerCase()}`);

    // Update budget bar percentage
    const fillPercent = (road.spent / road.budget) * 100;
    document.getElementById('detail-budget-fill').style.width = `${Math.min(fillPercent, 100)}%`;

    // Fetch and display complaints for this road
    fetch(`/api/road/${road.id}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                renderRoadComplaints(data.complaints);
            }
        });
        
    showToast(`Syncing telemetry for ${road.name}`);
}

// Render complaint logs inside the road details panel
function renderRoadComplaints(complaints) {
    const list = document.getElementById('detail-complaints-list');
    list.innerHTML = '';

    if (!complaints || complaints.length === 0) {
        list.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted);">No active complaints listed for this roadway.</p>';
        return;
    }

    complaints.forEach(c => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.style.borderLeftColor = c.severity === 'High' ? 'var(--health-critical)' : (c.severity === 'Medium' ? 'var(--health-fair)' : 'var(--neon-cyan)');
        
        // Format date nicely
        const dateStr = c.reported_at.split('T')[0];
        
        item.innerHTML = `
            <div class="timeline-header">
                <span class="text-cyan">TICKET #${c.id} // ${c.damage_type.toUpperCase()}</span>
                <span>${dateStr}</span>
            </div>
            <div class="timeline-desc">${c.description}</div>
            <div class="timeline-footer">
                <span>Severity: <b class="text-${c.severity === 'High' ? 'red' : (c.severity === 'Medium' ? 'yellow' : 'cyan')}">${c.severity}</b></span>
                <span>Status: <b class="text-cyan">${c.status}</b></span>
            </div>
        `;
        list.appendChild(item);
    });
}

// Render active complaints on the map as pulsing circles
function renderComplaintMarkers(complaints) {
    // Clear existing
    complaintMarkers.forEach(m => map.removeLayer(m));
    complaintMarkers = [];

    const cyanPulsingIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="map-pulse-marker"><div class="pulse-ring"></div></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    complaints.forEach(c => {
        if (!c.latitude || !c.longitude) return;

        const marker = L.marker([c.latitude, c.longitude], { icon: cyanPulsingIcon }).addTo(map);
        
        marker.bindPopup(`
            <div class="glass-popup">
                <span class="popup-title">CIVIC REPORT #${c.id}</span>
                <span class="popup-tag text-orange">${c.damage_type.toUpperCase()} // SEVERITY: ${c.severity}</span>
                <p class="popup-desc">${c.description}</p>
                <div class="popup-meta">
                    <div>Status: <b class="text-cyan">${c.status}</b></div>
                    <div>Engineer: <span class="text-muted" style="font-size:0.75rem;">${c.assigned_engineer || 'Pending'}</span></div>
                </div>
            </div>
        `);

        complaintMarkers.push(marker);
    });
}

// Initialize on page load when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    // In dev app.js handles map initialization coordinate sync
});
