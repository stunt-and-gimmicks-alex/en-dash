# backend/app/services/metrics_service.py - Service for storing and retrieving metrics

import sqlite3
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
import asyncio
import threading
import time

class MetricsService:
    def __init__(self, db_path: str = "data/metrics.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
        
        # Start background metrics collection
        self._collection_running = True
        self._collection_thread = threading.Thread(target=self._collect_metrics_loop, daemon=True)
        self._collection_thread.start()

    def _init_database(self):
        """Initialize the SQLite database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS system_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    metric_type TEXT NOT NULL,
                    value REAL NOT NULL,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_metrics_timestamp 
                ON system_metrics(timestamp, metric_type)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_metrics_type_time
                ON system_metrics(metric_type, timestamp DESC)
            """)

    def _collect_metrics_loop(self):
        """Background loop to collect system metrics every 30 seconds"""
        import psutil
        
        while self._collection_running:
            try:
                timestamp = datetime.utcnow()
                
                # Collect CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                self.store_metric("cpu_usage", cpu_percent, timestamp)
                
                # Collect memory usage
                memory = psutil.virtual_memory()
                self.store_metric("memory_usage", memory.percent, timestamp)
                self.store_metric("memory_used_gb", memory.used / (1024**3), timestamp)
                
                # Collect disk usage for root partition
                disk = psutil.disk_usage('/')
                disk_percent = (disk.used / disk.total) * 100
                self.store_metric("disk_usage", disk_percent, timestamp)
                
                # Collect network I/O
                network = psutil.net_io_counters()
                self.store_metric("network_bytes_sent", network.bytes_sent, timestamp)
                self.store_metric("network_bytes_recv", network.bytes_recv, timestamp)
                
                # Clean up old data (keep last 24 hours)
                self._cleanup_old_metrics()
                
                # Wait 10 seconds before next collection
                time.sleep(1)
                
            except Exception as e:
                print(f"Error collecting metrics: {e}")
                time.sleep(5)  # Wait before retrying

    def store_metric(self, metric_type: str, value: float, timestamp: Optional[datetime] = None, metadata: Optional[Dict] = None):
        """Store a single metric value"""
        if timestamp is None:
            timestamp = datetime.utcnow()
            
        metadata_json = json.dumps(metadata) if metadata else None
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO system_metrics (timestamp, metric_type, value, metadata)
                VALUES (?, ?, ?, ?)
            """, (timestamp, metric_type, value, metadata_json))

    def get_metrics(self, metric_type: str, hours: int = 1) -> List[Dict[str, Any]]:
        """Get metrics for a specific type within the last N hours"""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT timestamp, value, metadata
                FROM system_metrics
                WHERE metric_type = ? AND timestamp >= ?
                ORDER BY timestamp ASC
            """, (metric_type, since))
            
            results = []
            for row in cursor:
                results.append({
                    'timestamp': row['timestamp'],
                    'value': row['value'],
                    'metadata': json.loads(row['metadata']) if row['metadata'] else None
                })
            
            return results

    def get_latest_metrics(self) -> Dict[str, Any]:
        """Get the most recent value for each metric type"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT metric_type, value, timestamp, metadata
                FROM system_metrics m1
                WHERE timestamp = (
                    SELECT MAX(timestamp) 
                    FROM system_metrics m2 
                    WHERE m2.metric_type = m1.metric_type
                )
                ORDER BY metric_type
            """)
            
            results = {}
            for row in cursor:
                results[row['metric_type']] = {
                    'value': row['value'],
                    'timestamp': row['timestamp'],
                    'metadata': json.loads(row['metadata']) if row['metadata'] else None
                }
            
            return results

    def get_metric_summary(self, metric_type: str, hours: int = 24) -> Dict[str, float]:
        """Get summary statistics for a metric type"""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT 
                    AVG(value) as avg_value,
                    MIN(value) as min_value,
                    MAX(value) as max_value,
                    COUNT(*) as count
                FROM system_metrics
                WHERE metric_type = ? AND timestamp >= ?
            """, (metric_type, since))
            
            row = cursor.fetchone()
            if row:
                return {
                    'average': round(row[0], 2) if row[0] else 0,
                    'minimum': round(row[1], 2) if row[1] else 0,
                    'maximum': round(row[2], 2) if row[2] else 0,
                    'count': row[3]
                }
            
            return {'average': 0, 'minimum': 0, 'maximum': 0, 'count': 0}

    def _cleanup_old_metrics(self):
        """Remove metrics older than 24 hours"""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                DELETE FROM system_metrics 
                WHERE timestamp < ?
            """, (cutoff,))

    def get_all_metric_types(self) -> List[str]:
        """Get all available metric types"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT DISTINCT metric_type 
                FROM system_metrics 
                ORDER BY metric_type
            """)
            
            return [row[0] for row in cursor]

    def stop_collection(self):
        """Stop the background metrics collection"""
        self._collection_running = False

# Create global instance
metrics_service = MetricsService()