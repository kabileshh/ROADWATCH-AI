# RoadWatch AI Seeding Script

import json
from database import get_db, init_db

def seed_data():
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # Chennai Roads Data
    roads = [
        {
            "name": "Anna Salai (Mount Road)",
            "contractor": "Navayuga Engineering Co.",
            "budget": 8500000.0,
            "spent": 7200000.0,
            "last_repair_date": "2040-02-15",
            "health_score": 85,
            "condition": "Optimal",
            "coordinates": json.dumps([[13.0520, 80.2505], [13.0450, 80.2420], [13.0360, 80.2330], [13.0220, 80.2210]])
        },
        {
            "name": "Poonamallee High Road",
            "contractor": "Larsen & Toubro Infrastructure",
            "budget": 12000000.0,
            "spent": 11800000.0,
            "last_repair_date": "2039-11-04",
            "health_score": 38,
            "condition": "Critical",
            "coordinates": json.dumps([[13.0785, 80.2460], [13.0750, 80.2300], [13.0720, 80.2150], [13.0690, 80.2030]])
        },
        {
            "name": "Rajiv Gandhi Salai (OMR)",
            "contractor": "Adani Road Transport",
            "budget": 24500000.0,
            "spent": 18200000.0,
            "last_repair_date": "2040-04-10",
            "health_score": 92,
            "condition": "Optimal",
            "coordinates": json.dumps([[12.9930, 80.2510], [12.9800, 80.2490], [12.9680, 80.2480], [12.9550, 80.2470]])
        },
        {
            "name": "Velachery Main Road",
            "contractor": "GMR Infrastructure Ltd",
            "budget": 6200000.0,
            "spent": 5900000.0,
            "last_repair_date": "2040-01-20",
            "health_score": 62,
            "condition": "Fair",
            "coordinates": json.dumps([[13.0080, 80.2220], [12.9950, 80.2180], [12.9880, 80.2200], [12.9780, 80.2240]])
        },
        {
            "name": "East Coast Road (ECR)",
            "contractor": "IRB Infrastructure Developers",
            "budget": 18000000.0,
            "spent": 14000000.0,
            "last_repair_date": "2040-03-01",
            "health_score": 78,
            "condition": "Optimal",
            "coordinates": json.dumps([[12.9850, 80.2620], [12.9750, 80.2630], [12.9650, 80.2640], [12.9530, 80.2650]])
        },
        {
            "name": "Arcot Road",
            "contractor": "Soma Enterprise",
            "budget": 5400000.0,
            "spent": 5200000.0,
            "last_repair_date": "2039-08-12",
            "health_score": 25,
            "condition": "Critical",
            "coordinates": json.dumps([[13.0510, 80.2200], [13.0480, 80.2050], [13.0430, 80.1900], [13.0400, 80.1750]])
        }
    ]

    for road in roads:
        cursor.execute("""
            INSERT INTO roads (name, contractor, budget, spent, last_repair_date, health_score, condition, coordinates)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (road['name'], road['contractor'], road['budget'], road['spent'], road['last_repair_date'], road['health_score'], road['condition'], road['coordinates']))
    
    # Pre-populate some complaints
    complaints = [
        {
            "road_id": 2, # Poonamallee High Road
            "description": "Severe potholes appearing near the metro station exit, causing vehicle slow-downs.",
            "latitude": 13.0750,
            "longitude": 80.2300,
            "image_path": "/static/images/pothole_demo1.jpg",
            "status": "Dispatched",
            "damage_type": "Pothole",
            "severity": "High",
            "confidence": 0.94,
            "reported_at": "2040-05-20T10:30:00",
            "authority_dept": "Greater Chennai Corporation - Zone 8 (Anna Nagar)",
            "assigned_engineer": "Er. Karthikeyan Murugan",
            "routing_history": json.dumps([
                {"status": "AI_Analyzed", "time": "2040-05-20T10:30:15", "desc": "AI scanner flagged pothole severity HIGH with 94% confidence."},
                {"status": "Dispatched", "time": "2040-05-20T10:35:00", "desc": "Ticket routed automatically to Anna Nagar Civic Works terminal. Engineer assigned."}
            ])
        },
        {
            "road_id": 6, # Arcot Road
            "description": "Severe waterlogging due to blocked storm drains near Valasaravakkam junction.",
            "latitude": 13.0430,
            "longitude": 80.1900,
            "image_path": "/static/images/waterlogging_demo1.jpg",
            "status": "In_Progress",
            "damage_type": "Waterlogging",
            "severity": "High",
            "confidence": 0.89,
            "reported_at": "2040-05-22T08:15:00",
            "authority_dept": "GCC Zone 11 (Valasaravakkam) - Storm Water Drainage Dept",
            "assigned_engineer": "Er. Priya Rajan",
            "routing_history": json.dumps([
                {"status": "AI_Analyzed", "time": "2040-05-22T08:15:20", "desc": "AI classified: Waterlogging, 89% confidence."},
                {"status": "Dispatched", "time": "2040-05-22T08:20:00", "desc": "Routed to Zone 11 drainage task force."},
                {"status": "In_Progress", "time": "2040-05-22T14:00:00", "desc": "Crews active on site, pumping water and clearing drainage blockage."}
            ])
        },
        {
            "road_id": 4, # Velachery Main Road
            "description": "Multiple structural fissures and surface cracking extending over 50 meters.",
            "latitude": 12.9950,
            "longitude": 80.2180,
            "image_path": "/static/images/crack_demo1.jpg",
            "status": "AI_Analyzed",
            "damage_type": "Crack",
            "severity": "Medium",
            "confidence": 0.76,
            "reported_at": "2040-05-24T14:45:00",
            "authority_dept": "State Highways Department - South Division",
            "assigned_engineer": "Er. Ramesh Krishnan",
            "routing_history": json.dumps([
                {"status": "AI_Analyzed", "time": "2040-05-24T14:45:10", "desc": "AI classified: Structural Cracking, 76% confidence. Pending civic body confirmation."}
            ])
        }
    ]

    for c in complaints:
        cursor.execute("""
            INSERT INTO complaints (road_id, description, latitude, longitude, image_path, status, damage_type, severity, confidence, reported_at, authority_dept, assigned_engineer, routing_history)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (c['road_id'], c['description'], c['latitude'], c['longitude'], c['image_path'], c['status'], c['damage_type'], c['severity'], c['confidence'], c['reported_at'], c['authority_dept'], c['assigned_engineer'], c['routing_history']))

    conn.commit()
    conn.close()
    print("[SYSTEM] Database seeded with Chennai roads and complaints.")

if __name__ == "__main__":
    seed_data()
