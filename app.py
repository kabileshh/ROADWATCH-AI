# RoadWatch AI - Main Application Server

import os
import json
import math
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename

import database

app = Flask(__name__)

# Configurations
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB Max Upload

# Ensure uploads directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Try to load Gemini API key if present in environment or local config
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
has_gemini = False
if GEMINI_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_KEY)
        has_gemini = True
        print("[SYSTEM] Gemini AI configured successfully.")
    except Exception as e:
        print(f"[WARNING] Failed to load Gemini API: {e}")

# Helper to find the nearest road segment based on coordinates
def find_nearest_road(lat, lng):
    roads = database.get_roads()
    if not roads:
        return None
        
    min_dist = float('inf')
    closest_road = None
    
    for road in roads:
        coords = road.get('coordinates', [])
        for pt in coords:
            # Simple Euclidean distance for local distance ranking
            dist = math.sqrt((pt[0] - lat)**2 + (pt[1] - lng)**2)
            if dist < min_dist:
                min_dist = dist
                closest_road = road
                
    # If the closest coordinate is within 0.05 degrees (approx 5km), link it
    if min_dist < 0.05:
        return closest_road
    return None

# Helper to generate authority routing details dynamically
def get_authority_routing(lat, lng):
    # Chennai municipal zones are structured by coordinates roughly
    # Zone 5 (Royapuram) - Central/North-East
    # Zone 8 (Anna Nagar) - West
    # Zone 13 (Adyar) - South-East
    # Zone 15 (Sholinganallur) - South
    
    # GCC Zone determination based on latitude/longitude
    if lat > 13.06:
        if lng < 80.23:
            zone = "Zone 8 (Anna Nagar)"
            engineer = "Er. Anand Varma, Divisional Engineer"
            dept = "GCC Pavements & Roadways Division"
        else:
            zone = "Zone 5 (Royapuram)"
            engineer = "Er. Rajeshwari Swaminathan, Senior Engineer"
            dept = "GCC Central Works Department"
    else:
        if lng < 80.24:
            zone = "Zone 12 (Alandur)"
            engineer = "Er. Suresh Kumar, Executive Engineer"
            dept = "GCC Highways Maintenance Section"
        else:
            zone = "Zone 13 (Adyar)"
            engineer = "Er. Vignesh Subramanian, Assistant Engineer"
            dept = "GCC South Infrastructure Wing"
            
    return {
        "zone": zone,
        "engineer": engineer,
        "department": dept
    }

# Serving the static HTML HUD page
@app.route('/')
def index():
    return render_template('index.html')

# Serve uploaded files
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# API: Get all roads
@app.route('/api/roads', methods=['GET'])
def api_get_roads():
    roads = database.get_roads()
    return jsonify({"status": "success", "roads": roads})

# API: Get details of a single road
@app.route('/api/road/<int:road_id>', methods=['GET'])
def api_get_road(road_id):
    road = database.get_road(road_id)
    if road:
        complaints = database.get_road_complaints(road_id)
        return jsonify({"status": "success", "road": road, "complaints": complaints})
    return jsonify({"status": "error", "message": "Road not found"}), 404

# API: Get all complaints
@app.route('/api/complaints', methods=['GET'])
def api_get_complaints():
    complaints = database.get_complaints()
    return jsonify({"status": "success", "complaints": complaints})

# API: AI damage detection processing
@app.route('/api/detect', methods=['POST'])
def api_detect_damage():
    if 'image' not in request.files:
        return jsonify({"status": "error", "message": "No image file provided"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No file selected"}), 400
        
    filename = secure_filename(file.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(save_path)
    
    # AI detection simulation
    # We analyze the filename or trigger a mock prediction that outputs highly realistic bounding boxes
    # This allows the frontend canvas to draw glowing target indicators with confidence tags.
    name_lower = filename.lower()
    
    detections = []
    if "pothole" in name_lower or "hole" in name_lower:
        detections.append({
            "type": "Pothole",
            "bbox": [150, 180, 220, 140],  # [x, y, width, height]
            "confidence": 0.94,
            "severity": "High"
        })
    elif "crack" in name_lower or "fissure" in name_lower:
        detections.append({
            "type": "Crack",
            "bbox": [80, 250, 300, 80],
            "confidence": 0.81,
            "severity": "Medium"
        })
    elif "water" in name_lower or "flood" in name_lower or "clog" in name_lower:
        detections.append({
            "type": "Waterlogging",
            "bbox": [50, 120, 380, 200],
            "confidence": 0.88,
            "severity": "High"
        })
    else:
        # Default mock detection if it's an arbitrary image, to ensure the user gets a working demo
        detections.append({
            "type": "Pothole",
            "bbox": [180, 160, 190, 130],
            "confidence": 0.72,
            "severity": "Medium"
        })
        
    return jsonify({
        "status": "success",
        "image_url": f"/uploads/{filename}",
        "detections": detections
    })

# API: Report a new complaint
@app.route('/api/complaint', methods=['POST'])
def api_report_complaint():
    try:
        data = request.form
        description = data.get('description', '')
        lat = float(data.get('latitude', 0))
        lng = float(data.get('longitude', 0))
        damage_type = data.get('damage_type', 'Other')
        severity = data.get('severity', 'Medium')
        confidence = float(data.get('confidence', 0.85))
        image_path = data.get('image_path', '')
        
        # 1. Resolve nearest road segment dynamically
        road = find_nearest_road(lat, lng)
        road_id = road['id'] if road else None
        
        # 2. Determine routing authority dynamically based on coordinate zone
        routing = get_authority_routing(lat, lng)
        authority_dept = routing['department']
        assigned_engineer = routing['engineer']
        
        # 3. Create routing history log
        now_str = datetime.now().isoformat()
        routing_history = [
            {
                "status": "AI_Analyzed", 
                "time": now_str, 
                "desc": f"AI classified {damage_type} severity {severity.upper()} with {confidence*100:.1f}% confidence."
            },
            {
                "status": "Dispatched", 
                "time": now_str, 
                "desc": f"System auto-routed ticket to {routing['zone']}. Lead Engineer assigned: {assigned_engineer}."
            }
        ]
        routing_history_json = json.dumps(routing_history)
        
        # 4. Insert complaint
        complaint_id = database.add_complaint(
            road_id, description, lat, lng, image_path, 'Dispatched', 
            damage_type, severity, confidence, now_str, 
            authority_dept, assigned_engineer, routing_history_json
        )
        
        return jsonify({
            "status": "success",
            "message": "Complaint successfully logged and routed.",
            "complaint_id": complaint_id,
            "road_name": road['name'] if road else "Unmapped Civic Area",
            "authority_dept": authority_dept,
            "assigned_engineer": assigned_engineer,
            "routing_history": routing_history
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

# API: AI Assistant Chatbot
@app.route('/api/chat', methods=['POST'])
def api_chat():
    req_data = request.json or {}
    message = req_data.get('message', '').strip()
    
    if not message:
        return jsonify({"status": "error", "message": "Message is empty"}), 400
        
    db_summary = get_db_summary()
    
    # If Gemini is enabled, we use it with a strict, immersive system instruction
    if has_gemini:
        try:
            model = genai.GenerativeModel('gemini-pro')
            prompt = f"""
            You are "RoadWatch Core AI", a highly advanced smart-city road monitoring and transparency agent operating in the year 2040.
            Your responses should be clean, concise, slightly futuristic in tone, and helpful. Use system logs and formatting codes if appropriate.
            
            Here is the current real-time database state of Chennai roads under your monitoring scope:
            {db_summary}
            
            Based on this database state, answer the citizen's query. Be precise. If they ask about budget, contractors, repair dates, or active complaints, look at the database state and give the exact information. If they ask general smart city questions, answer them in character.
            
            Citizen Query: {message}
            """
            response = model.generate_content(prompt)
            return jsonify({
                "status": "success",
                "response": response.text,
                "agent": "Gemini 2040 Core"
            })
        except Exception as e:
            print(f"[ERROR] Gemini generation failed, falling back to local engine: {e}")
            
    # Fallback / Local Rule-based Database Query Parser
    msg_lower = message.lower()
    response_text = ""
    
    roads = database.get_roads()
    complaints = database.get_complaints()
    
    # 1. Check for specific road inquiries
    target_road = None
    for r in roads:
        name_lower = r['name'].lower()
        if "mount" in msg_lower and "mount" in name_lower:
            target_road = r
            break
        elif "anna salai" in msg_lower and "anna salai" in name_lower:
            target_road = r
            break
        elif "poonamallee" in msg_lower and "poonamallee" in name_lower:
            target_road = r
            break
        elif "omr" in msg_lower and "omr" in name_lower:
            target_road = r
            break
        elif "rajiv" in msg_lower and "rajiv" in name_lower:
            target_road = r
            break
        elif "velachery" in msg_lower and "velachery" in name_lower:
            target_road = r
            break
        elif "ecr" in msg_lower and "ecr" in name_lower:
            target_road = r
            break
        elif "east coast" in msg_lower and "east coast" in name_lower:
            target_road = r
            break
        elif "arcot" in msg_lower and "arcot" in name_lower:
            target_road = r
            break
            
    if target_road:
        if "contractor" in msg_lower or "who maintains" in msg_lower or "who is repairing" in msg_lower:
            response_text = f"[SYSTEM LOG] Querying Registry for '{target_road['name']}'...\n" \
                            f"Contractor: {target_road['contractor']}\n" \
                            f"Last Repair Sync: {target_road['last_repair_date']}\n" \
                            f"Platform Status: Operational."
        elif "budget" in msg_lower or "cost" in msg_lower or "allocated" in msg_lower:
            deficit = target_road['budget'] - target_road['spent']
            response_text = f"[FINANCIAL TELEMETRY] Road: {target_road['name']}\n" \
                            f"Allocated Budget: ₹{target_road['budget']:,.2f}\n" \
                            f"Spent to Date: ₹{target_road['spent']:,.2f}\n" \
                            f"Remaining Reserves: ₹{deficit:,.2f} ({ (target_road['spent']/target_road['budget'])*100:.1f}% consumed)."
        elif "health" in msg_lower or "condition" in msg_lower or "quality" in msg_lower:
            response_text = f"[TELEMETRY SCAN] Segment: {target_road['name']}\n" \
                            f"Health Integrity: {target_road['health_score']}/100\n" \
                            f"Classification: {target_road['condition'].upper()}\n" \
                            f"Structural Analysis: Wear levels align with contractor telemetry."
        elif "complaint" in msg_lower or "issues" in msg_lower or "pothole" in msg_lower:
            road_complaints = [c for c in complaints if c['road_id'] == target_road['id']]
            if road_complaints:
                issues_str = "\n".join([f"- Ticket #{c['id']}: {c['damage_type']} ({c['severity']} severity) - {c['status']}" for c in road_complaints])
                response_text = f"[TICKET REPORT] Found {len(road_complaints)} active citizen logs on {target_road['name']}:\n{issues_str}"
            else:
                response_text = f"[SYSTEM REPORT] zero active complaints cataloged for {target_road['name']}. Segment health is marked {target_road['condition']}."
        else:
            response_text = f"[CORE DATAPACK] Road: {target_road['name']}\n" \
                            f"Contractor: {target_road['contractor']}\n" \
                            f"Health Index: {target_road['health_score']}/100 ({target_road['condition']})\n" \
                            f"Budget consumed: ₹{target_road['spent']:,.2f} / ₹{target_road['budget']:,.2f}"
                            
    # 2. General Queries
    elif "critical" in msg_lower or "bad roads" in msg_lower or "damage" in msg_lower:
        critical_roads = [r for r in roads if r['condition'] == 'Critical']
        if critical_roads:
            roads_str = ", ".join([r['name'] for r in critical_roads])
            response_text = f"[INTEGRITY SCAN] Critical segments identified: {roads_str}. Immediate maintenance schedules have been auto-dispatched."
        else:
            response_text = f"[INTEGRITY SCAN] All monitored pathways are maintaining nominal health index limits (>= 40)."
            
    elif "budget" in msg_lower or "financials" in msg_lower:
        total_budget = sum([r['budget'] for r in roads])
        total_spent = sum([r['spent'] for r in roads])
        response_text = f"[AGGREGATED FINANCIAL REPORT]\n" \
                        f"Global Road Maintenance Budget: ₹{total_budget:,.2f}\n" \
                        f"Cumulative Disbursed Funds: ₹{total_spent:,.2f}\n" \
                        f"Utilization Ratio: {(total_spent/total_budget)*100:.1f}%\n" \
                        f"Transparency Hash: 0x9F82A... Verified on Smart City Ledger."
                        
    elif "complaint" in msg_lower or "ticket" in msg_lower:
        response_text = f"[CIVIC TICKET COUNT] Database reports {len(complaints)} total logs active.\n" \
                        f"Status breakdown: {len([c for c in complaints if c['status']=='Resolved'])} Resolved, " \
                        f"{len([c for c in complaints if c['status']=='In_Progress'])} In Progress, " \
                        f"{len([c for c in complaints if c['status']=='Dispatched'])} Dispatched."
                        
    else:
        # Default smart futuristic response
        response_text = "Greetings, Citizen. I am RoadWatch AI Core (v2040.8). " \
                        "Ask me about contractor info, budget breakdowns, health diagnostics of Chennai roads, or active complaints. " \
                        "Example: 'Who is the contractor for Poonamallee High Road?' or 'What is the budget for OMR?'"
                        
    return jsonify({
        "status": "success",
        "response": response_text,
        "agent": "Local heuristic 2040 engine"
    })

# Helper to summarize db for LLM prompt context
def get_db_summary():
    try:
        roads = database.get_roads()
        complaints = database.get_complaints()
        
        summary = "ROAD SYSTEM DATA:\n"
        for r in roads:
            summary += f"- {r['name']} (ID: {r['id']}): Contractor is '{r['contractor']}'. Budget allocated is ₹{r['budget']:.0f}, spent ₹{r['spent']:.0f}. Health is {r['health_score']}/100 ({r['condition']}). Last repair: {r['last_repair_date']}.\n"
            
        summary += "\nACTIVE CITIZEN COMPLAINTS:\n"
        for c in complaints:
            summary += f"- Complaint ID {c['id']}: Road ID {c['road_id']} ({c['road_name']}). Type: {c['damage_type']}, Severity: {c['severity']}, Status: {c['status']}. Assigned to {c['authority_dept']}, Lead Engineer: {c['assigned_engineer']}.\n"
            
        return summary
    except Exception as e:
        return f"Error retrieving state: {e}"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
