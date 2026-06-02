# RoadWatch AI Database Interface

import sqlite3
import json
import os

DATABASE_PATH = 'roadwatch.db'

def get_db():
    """Returns a connection to the SQLite database with Row factory enabled."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database using the schema.sql template."""
    conn = get_db()
    with open('schema.sql', 'r') as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print("[SYSTEM] Database initialized successfully.")

def get_roads():
    """Fetches all roads from the database."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM roads")
    rows = cursor.fetchall()
    conn.close()
    
    roads_list = []
    for row in rows:
        r = dict(row)
        try:
            r['coordinates'] = json.loads(r['coordinates'])
        except Exception:
            r['coordinates'] = []
        roads_list.append(r)
    return roads_list

def get_road(road_id):
    """Fetches a specific road by its ID."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM roads WHERE id = ?", (road_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        r = dict(row)
        try:
            r['coordinates'] = json.loads(r['coordinates'])
        except Exception:
            r['coordinates'] = []
        return r
    return None

def get_complaints():
    """Fetches all complaints, showing associated road details."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, r.name as road_name 
        FROM complaints c
        LEFT JOIN roads r ON c.road_id = r.id
        ORDER BY c.reported_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    complaints_list = []
    for row in rows:
        c = dict(row)
        try:
            c['routing_history'] = json.loads(c['routing_history']) if c['routing_history'] else []
        except Exception:
            c['routing_history'] = []
        complaints_list.append(c)
    return complaints_list

def get_road_complaints(road_id):
    """Fetches all complaints related to a specific road."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM complaints WHERE road_id = ? ORDER BY reported_at DESC", (road_id,))
    rows = cursor.fetchall()
    conn.close()
    
    complaints_list = []
    for row in rows:
        c = dict(row)
        try:
            c['routing_history'] = json.loads(c['routing_history']) if c['routing_history'] else []
        except Exception:
            c['routing_history'] = []
        complaints_list.append(c)
    return complaints_list

def add_complaint(road_id, description, latitude, longitude, image_path, status, damage_type, severity, confidence, reported_at, authority_dept, assigned_engineer, routing_history_json):
    """Adds a new road complaint and dynamic update to the road condition details."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO complaints (
            road_id, description, latitude, longitude, image_path, 
            status, damage_type, severity, confidence, reported_at, 
            authority_dept, assigned_engineer, routing_history
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (road_id, description, latitude, longitude, image_path, status, damage_type, severity, confidence, reported_at, authority_dept, assigned_engineer, routing_history_json))
    complaint_id = cursor.lastrowid
    
    # Dynamic degradation: reduce road health score and update status category
    if road_id:
        cursor.execute("SELECT health_score FROM roads WHERE id = ?", (road_id,))
        row = cursor.fetchone()
        if row:
            current_health = row['health_score']
            # Deduct points based on severity
            deduction = 18 if severity == 'High' else (10 if severity == 'Medium' else 5)
            new_health = max(0, current_health - deduction)
            
            # Recalculate status condition
            new_condition = 'Optimal'
            if new_health < 40:
                new_condition = 'Critical'
            elif new_health < 75:
                new_condition = 'Fair'
                
            cursor.execute("UPDATE roads SET health_score = ?, condition = ? WHERE id = ?", (new_health, new_condition, road_id))
            
    conn.commit()
    conn.close()
    return complaint_id
