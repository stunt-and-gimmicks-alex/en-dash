# backend/app/routers/metrics.py - API endpoints for metrics data

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..services.metrics_service import metrics_service

router = APIRouter()

@router.get("/cpu")
async def get_cpu_metrics(hours: int = Query(1, ge=1, le=24)):
    """Get CPU usage metrics for the last N hours"""
    try:
        metrics = metrics_service.get_metrics("cpu_usage", hours=hours)
        return {
            "metric_type": "cpu_usage",
            "data": metrics,
            "summary": metrics_service.get_metric_summary("cpu_usage", hours=hours)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving CPU metrics: {str(e)}")

@router.get("/memory")
async def get_memory_metrics(hours: int = Query(1, ge=1, le=24)):
    """Get memory usage metrics for the last N hours"""
    try:
        metrics = metrics_service.get_metrics("memory_usage", hours=hours)
        return {
            "metric_type": "memory_usage", 
            "data": metrics,
            "summary": metrics_service.get_metric_summary("memory_usage", hours=hours)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving memory metrics: {str(e)}")

@router.get("/disk")
async def get_disk_metrics(hours: int = Query(1, ge=1, le=24)):
    """Get disk usage metrics for the last N hours"""
    try:
        metrics = metrics_service.get_metrics("disk_usage", hours=hours)
        return {
            "metric_type": "disk_usage",
            "data": metrics,
            "summary": metrics_service.get_metric_summary("disk_usage", hours=hours)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving disk metrics: {str(e)}")

@router.get("/network")
async def get_network_metrics(hours: int = Query(1, ge=1, le=24)):
    """Get network I/O metrics for the last N hours"""
    try:
        sent_metrics = metrics_service.get_metrics("network_bytes_sent", hours=hours)
        recv_metrics = metrics_service.get_metrics("network_bytes_recv", hours=hours)
        
        return {
            "metric_type": "network_io",
            "data": {
                "bytes_sent": sent_metrics,
                "bytes_received": recv_metrics
            },
            "summary": {
                "bytes_sent": metrics_service.get_metric_summary("network_bytes_sent", hours=hours),
                "bytes_received": metrics_service.get_metric_summary("network_bytes_recv", hours=hours)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving network metrics: {str(e)}")

@router.get("/latest")
async def get_latest_metrics():
    """Get the most recent value for all metric types"""
    try:
        latest = metrics_service.get_latest_metrics()
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": latest
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving latest metrics: {str(e)}")

@router.get("/summary")
async def get_metrics_summary(hours: int = Query(24, ge=1, le=168)):
    """Get summary statistics for all metrics over the last N hours"""
    try:
        metric_types = metrics_service.get_all_metric_types()
        summary = {}
        
        for metric_type in metric_types:
            summary[metric_type] = metrics_service.get_metric_summary(metric_type, hours=hours)
        
        return {
            "period_hours": hours,
            "summary": summary,
            "available_metrics": metric_types
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving metrics summary: {str(e)}")

@router.get("/types")
async def get_metric_types():
    """Get all available metric types"""
    try:
        types = metrics_service.get_all_metric_types()
        return {
            "metric_types": types,
            "count": len(types)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving metric types: {str(e)}")

@router.get("/health")
async def metrics_health():
    """Health check for metrics service"""
    try:
        latest = metrics_service.get_latest_metrics()
        
        # Check if we have recent data (within last 2 minutes)
        import datetime as dt
        two_minutes_ago = dt.datetime.utcnow() - dt.timedelta(minutes=2)
        
        has_recent_data = False
        if latest:
            for metric_type, data in latest.items():
                if data['timestamp']:
                    metric_time = dt.datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
                    if metric_time > two_minutes_ago:
                        has_recent_data = True
                        break
        
        return {
            "status": "healthy" if has_recent_data else "stale",
            "metrics_count": len(latest),
            "last_collection": max([data['timestamp'] for data in latest.values() if data['timestamp']]) if latest else None,
            "collection_active": has_recent_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics service health check failed: {str(e)}")