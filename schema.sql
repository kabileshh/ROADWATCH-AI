-- RoadWatch AI Schema Definitions

CREATE TABLE IF NOT EXISTS roads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contractor TEXT NOT NULL,
    budget REAL NOT NULL,
    spent REAL NOT NULL,
    last_repair_date TEXT NOT NULL,
    health_score INTEGER NOT NULL,
    condition TEXT NOT NULL, -- 'Optimal', 'Fair', 'Critical'
    coordinates TEXT NOT NULL -- JSON array: [[lat1, lng1], [lat2, lng2], ...]
);

CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_id INTEGER,
    description TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    image_path TEXT,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'AI_Analyzed', 'Dispatched', 'In_Progress', 'Resolved'
    damage_type TEXT DEFAULT 'Other', -- 'Pothole', 'Crack', 'Waterlogging', 'Other'
    severity TEXT DEFAULT 'Medium', -- 'Low', 'Medium', 'High'
    confidence REAL DEFAULT 0.0,
    reported_at TEXT NOT NULL,
    authority_dept TEXT,
    assigned_engineer TEXT,
    routing_history TEXT, -- JSON array of routing status events
    FOREIGN KEY(road_id) REFERENCES roads(id)
);
