# backend/app/routers/auth.py - Authentication endpoints (basic setup)

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

router = APIRouter()
security = HTTPBearer(auto_error=False)

# Simple API key authentication (replace with proper auth in production)
API_KEY = "en-dash-api-key-change-this-in-production"

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Simple API key authentication"""
    if not credentials:
        return None  # Allow unauthenticated access for now
    
    if credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return {"username": "admin"}  # Simple user object

@router.get("/me")
async def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current user information"""
    if not current_user:
        return {"authenticated": False}
    
    return {
        "authenticated": True,
        "user": current_user
    }

@router.post("/login")
async def login(username: str, password: str):
    """Simple login endpoint (for future use)"""
    # TODO: Implement proper authentication
    if username == "admin" and password == "admin":
        return {
            "access_token": API_KEY,
            "token_type": "bearer",
            "user": {"username": username}
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")