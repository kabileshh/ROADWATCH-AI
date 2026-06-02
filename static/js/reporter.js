// RoadWatch AI // Smart Complaint Reporting Coordinator

let uploadedImageFile = null;
let uploadedImagePath = "";
let resolvedDamageData = null;

// Initialize events
function initReporter() {
    const dragZone = document.getElementById('image-drag-zone');
    const fileInput = document.getElementById('image-input');
    const form = document.getElementById('complaint-form');

    // Drag events
    dragZone.addEventListener('click', () => fileInput.click());
    
    dragZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragZone.classList.add('dragover');
    });
    
    dragZone.addEventListener('dragleave', () => {
        dragZone.classList.remove('dragover');
    });
    
    dragZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dragZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUploadedFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleUploadedFile(e.target.files[0]);
        }
    });

    // Submit form
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitComplaint();
    });
}

// Handle file loading and trigger AI scanner
function handleUploadedFile(file) {
    uploadedImageFile = file;

    // Display preview
    const preview = document.getElementById('selected-image-preview');
    const previewContainer = document.getElementById('image-preview-container');
    const prompt = dragZonePrompt = document.querySelector('.zone-prompt');

    preview.src = URL.createObjectURL(file);
    previewContainer.classList.remove('hidden');
    prompt.classList.add('hidden');

    // Trigger canvas scanner visual
    DetectionScanner.loadImage(file);

    // Call API for Damage Detection scanning
    runAiDetectionScan(file);
}

// Call API detect route
function runAiDetectionScan(file) {
    const formData = new FormData();
    formData.append('image', file);

    // Reset routing HUD UI
    const routingHud = document.getElementById('dynamic-routing-hud');
    routingHud.classList.remove('hidden');
    
    resetRoutingSteps();
    setRoutingStepActive(1); // Scan Engine Running

    fetch('/api/detect', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            uploadedImagePath = data.image_url;
            
            // Draw boxes
            DetectionScanner.setDetections(data.detections);

            if (data.detections && data.detections.length > 0) {
                resolvedDamageData = data.detections[0];
                
                // Update diagnostic readouts
                document.getElementById('ai-diag-type').innerText = resolvedDamageData.type.toUpperCase();
                document.getElementById('ai-diag-conf').innerText = `${(resolvedDamageData.confidence * 100).toFixed(1)}%`;
                document.getElementById('ai-diag-severity').innerText = resolvedDamageData.severity.toUpperCase();
                
                // Colors based on severity
                const sevText = document.getElementById('ai-diag-severity');
                sevText.className = 'value';
                if (resolvedDamageData.severity === 'High') {
                    sevText.classList.add('text-red');
                } else if (resolvedDamageData.severity === 'Medium') {
                    sevText.classList.add('text-yellow');
                } else {
                    sevText.classList.add('text-cyan');
                }

                // Advance routing step 1
                setRoutingStepComplete(1, "Damage Coordinates Identified");
                setRoutingStepActive(2); // Zone check active
                
                // Auto fill latitude and longitude if not entered
                const latInput = document.getElementById('report-lat');
                const lngInput = document.getElementById('report-lng');
                if (!latInput.value) latInput.value = "13.0725";
                if (!lngInput.value) lngInput.value = "80.2220";
                
                // Update step 2 description dynamically based on local coordinate calculation in js
                resolveZoneMock(parseFloat(latInput.value), parseFloat(lngInput.value));
            } else {
                showToast("AI scanner completed. No critical roadway defects recognized.");
                setRoutingStepComplete(1, "Scan Complete - Nominal");
            }
        } else {
            showToast("Sub-core AI parsing error.");
        }
    })
    .catch(err => {
        console.error("AI scanning error:", err);
        showToast("Error connecting to detection matrix.");
    });
}

function resolveZoneMock(lat, lng) {
    let zone = "Zone 8 (Anna Nagar)";
    if (lat > 13.06) {
        zone = lng < 80.23 ? "Zone 8 (Anna Nagar)" : "Zone 5 (Royapuram)";
    } else {
        zone = lng < 80.24 ? "Zone 12 (Alandur)" : "Zone 13 (Adyar)";
    }
    document.getElementById('routing-zone-desc').innerText = `Syncing details with ${zone}`;
}

// Reset routing timeline
function resetRoutingSteps() {
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById(`routing-step-${i}`);
        step.classList.remove('active', 'routed');
    }
    document.getElementById('routing-zone-desc').innerText = 'Resolving nearest boundary';
    document.getElementById('routing-engineer-desc').innerText = 'Assigning lead contractor';
}

function setRoutingStepActive(stepNum) {
    const step = document.getElementById(`routing-step-${stepNum}`);
    step.classList.add('active');
    step.classList.remove('routed');
}

function setRoutingStepComplete(stepNum, description = "") {
    const step = document.getElementById(`routing-step-${stepNum}`);
    step.classList.add('routed');
    if (description) {
        step.querySelector('.step-desc').innerText = description;
    }
}

// Submit complaint to Flask
function submitComplaint() {
    const description = document.getElementById('report-description').value;
    const lat = document.getElementById('report-lat').value;
    const lng = document.getElementById('report-lng').value;

    if (!description || !lat || !lng) {
        showToast("Error: Empty parameters. Telemetry requires description and coordinates.");
        return;
    }

    // Build form data
    const formData = new FormData();
    formData.append('description', description);
    formData.append('latitude', lat);
    formData.append('longitude', lng);
    formData.append('image_path', uploadedImagePath);
    
    if (resolvedDamageData) {
        formData.append('damage_type', resolvedDamageData.type);
        formData.append('severity', resolvedDamageData.severity);
        formData.append('confidence', resolvedDamageData.confidence);
    } else {
        formData.append('damage_type', 'Other');
        formData.append('severity', 'Medium');
        formData.append('confidence', '0.75');
    }

    // Update dispatch routing Step 2 to done
    setRoutingStepComplete(2, "Boundary resolved dynamically");
    setRoutingStepActive(3); // Assigning engineer

    fetch('/api/complaint', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            setRoutingStepComplete(3, `Assigned: ${data.assigned_engineer}`);
            showToast("Holographic dispatch timeline committed.");

            // Add marker to map
            if (typeof renderComplaintMarkers === 'function') {
                // Fetch full list again to refresh map
                setTimeout(() => {
                    syncTelemetryData();
                    if (typeof refreshDashboardTelemetry === 'function') {
                        refreshDashboardTelemetry();
                    }
                }, 1000);
            }

            // Success feedback and reset
            setTimeout(() => {
                showToast(`Success: Anomaly ticket #${data.complaint_id} dispatched!`);
                resetComplaintForm();
            }, 2500);
        } else {
            showToast("Failed to write anomaly to SQLite registry.");
        }
    })
    .catch(err => {
        console.error("Complaint save error:", err);
        showToast("Error establishing connection to registry database.");
    });
}

function resetComplaintForm() {
    document.getElementById('complaint-form').reset();
    
    // Clear preview
    const previewContainer = document.getElementById('image-preview-container');
    const prompt = document.querySelector('.zone-prompt');
    previewContainer.classList.add('hidden');
    prompt.classList.remove('hidden');
    
    // Clear AI Diagnostics
    document.getElementById('ai-diag-type').innerText = 'N/A';
    document.getElementById('ai-diag-conf').innerText = '0.0%';
    document.getElementById('ai-diag-severity').innerText = 'N/A';
    
    const sevText = document.getElementById('ai-diag-severity');
    sevText.className = 'value';

    // Clear canvas
    DetectionScanner.clearCanvas();
    resolvedDamageData = null;
    uploadedImageFile = null;
    uploadedImagePath = "";
    
    // Hide routing steps
    document.getElementById('dynamic-routing-hud').classList.add('hidden');
}

window.addEventListener('DOMContentLoaded', () => {
    initReporter();
});
