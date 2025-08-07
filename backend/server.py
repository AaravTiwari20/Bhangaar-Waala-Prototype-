from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import pymongo
from pymongo import MongoClient
import os
import jwt
import bcrypt
import uuid
from enum import Enum

# Initialize FastAPI app
app = FastAPI(title="Bhangaar Waala API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client.bhangaar_waala

# JWT settings
SECRET_KEY = "bhangaar_waala_secret_key_2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    HOUSEHOLD = "household"
    COLLECTOR = "collector"
    ADMIN = "admin"

class WasteType(str, Enum):
    DRY = "dry"
    WET = "wet"
    ELECTRONIC = "electronic"
    MEDICAL = "medical"
    RECYCLABLE = "recyclable"

class PickupStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    ON_THE_WAY = "on_the_way"
    COLLECTED = "collected"
    FAILED = "failed"

# Pydantic models
class UserBase(BaseModel):
    email: str
    name: str
    phone: str
    role: UserRole
    address: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    id: str
    eco_points: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PickupRequest(BaseModel):
    waste_type: WasteType
    pickup_date: datetime
    pickup_time: str
    location: str
    address: str
    photo_url: Optional[str] = None
    notes: Optional[str] = None

class Pickup(PickupRequest):
    id: str
    user_id: str
    collector_id: Optional[str] = None
    status: PickupStatus = PickupStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    rating: Optional[int] = None
    feedback: Optional[str] = None

class CollectorStats(BaseModel):
    total_pickups: int
    completed_pickups: int
    rating: float
    eco_points_distributed: int

class ChatMessage(BaseModel):
    id: str
    pickup_id: str
    sender_id: str
    sender_role: UserRole
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Authentication routes
@app.post("/api/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "role": user_data.role,
        "address": user_data.address,
        "password": hashed_password,
        "eco_points": 0,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": user_data.role,
            "eco_points": 0
        }
    }

@app.post("/api/login")
async def login(user_data: UserLogin):
    user = db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "eco_points": user.get("eco_points", 0)
        }
    }

# Pickup routes
@app.post("/api/pickups")
async def create_pickup(pickup_data: PickupRequest, current_user = Depends(get_current_user)):
    if current_user["role"] != "household":
        raise HTTPException(status_code=403, detail="Only households can create pickups")
    
    pickup_id = str(uuid.uuid4())
    pickup_doc = {
        "id": pickup_id,
        "user_id": current_user["id"],
        "waste_type": pickup_data.waste_type,
        "pickup_date": pickup_data.pickup_date,
        "pickup_time": pickup_data.pickup_time,
        "location": pickup_data.location,
        "address": pickup_data.address,
        "photo_url": pickup_data.photo_url,
        "notes": pickup_data.notes,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    db.pickups.insert_one(pickup_doc)
    
    return {"message": "Pickup request created", "pickup_id": pickup_id}

@app.get("/api/pickups")
async def get_pickups(current_user = Depends(get_current_user)):
    if current_user["role"] == "household":
        pickups = list(db.pickups.find({"user_id": current_user["id"]}, {"_id": 0}))
    elif current_user["role"] == "collector":
        pickups = list(db.pickups.find({"$or": [{"collector_id": current_user["id"]}, {"status": "pending"}]}, {"_id": 0}))
    else:  # admin
        pickups = list(db.pickups.find({}, {"_id": 0}))
    
    # Add user details to each pickup
    for pickup in pickups:
        user = db.users.find_one({"id": pickup["user_id"]}, {"_id": 0, "password": 0})
        pickup["user"] = user
        if pickup.get("collector_id"):
            collector = db.users.find_one({"id": pickup["collector_id"]}, {"_id": 0, "password": 0})
            pickup["collector"] = collector
    
    return pickups

@app.put("/api/pickups/{pickup_id}/assign")
async def assign_pickup(pickup_id: str, current_user = Depends(get_current_user)):
    if current_user["role"] not in ["collector", "admin"]:
        raise HTTPException(status_code=403, detail="Only collectors and admins can assign pickups")
    
    pickup = db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    
    if pickup["status"] != "pending":
        raise HTTPException(status_code=400, detail="Pickup already assigned or completed")
    
    collector_id = current_user["id"] if current_user["role"] == "collector" else None
    
    db.pickups.update_one(
        {"id": pickup_id},
        {
            "$set": {
                "collector_id": collector_id,
                "status": "assigned",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Pickup assigned successfully"}

@app.put("/api/pickups/{pickup_id}/status")
async def update_pickup_status(pickup_id: str, status: PickupStatus, current_user = Depends(get_current_user)):
    pickup = db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    
    # Check permissions
    if current_user["role"] == "collector" and pickup.get("collector_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only update your assigned pickups")
    
    db.pickups.update_one(
        {"id": pickup_id},
        {
            "$set": {
                "status": status,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Award eco points if pickup completed
    if status == "collected":
        points_map = {
            "dry": 10,
            "wet": 5,
            "electronic": 25,
            "medical": 20,
            "recyclable": 15
        }
        points = points_map.get(pickup["waste_type"], 10)
        
        db.users.update_one(
            {"id": pickup["user_id"]},
            {"$inc": {"eco_points": points}}
        )
    
    return {"message": "Status updated successfully"}

@app.post("/api/pickups/{pickup_id}/rate")
async def rate_pickup(pickup_id: str, rating: int, feedback: Optional[str] = None, current_user = Depends(get_current_user)):
    if current_user["role"] != "household":
        raise HTTPException(status_code=403, detail="Only households can rate pickups")
    
    pickup = db.pickups.find_one({"id": pickup_id})
    if not pickup or pickup["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Pickup not found")
    
    if pickup["status"] != "collected":
        raise HTTPException(status_code=400, detail="Can only rate completed pickups")
    
    db.pickups.update_one(
        {"id": pickup_id},
        {
            "$set": {
                "rating": rating,
                "feedback": feedback,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Rating submitted successfully"}

# Chat routes
@app.post("/api/chat/{pickup_id}")
async def send_message(pickup_id: str, message: str, current_user = Depends(get_current_user)):
    pickup = db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    
    # Check if user is involved in this pickup
    if current_user["id"] not in [pickup["user_id"], pickup.get("collector_id")]:
        raise HTTPException(status_code=403, detail="You are not involved in this pickup")
    
    message_id = str(uuid.uuid4())
    message_doc = {
        "id": message_id,
        "pickup_id": pickup_id,
        "sender_id": current_user["id"],
        "sender_role": current_user["role"],
        "message": message,
        "timestamp": datetime.utcnow()
    }
    
    db.chat_messages.insert_one(message_doc)
    
    return {"message": "Message sent successfully", "message_id": message_id}

@app.get("/api/chat/{pickup_id}")
async def get_messages(pickup_id: str, current_user = Depends(get_current_user)):
    pickup = db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup not found")
    
    # Check if user is involved in this pickup
    if current_user["id"] not in [pickup["user_id"], pickup.get("collector_id")]:
        raise HTTPException(status_code=403, detail="You are not involved in this pickup")
    
    messages = list(db.chat_messages.find({"pickup_id": pickup_id}, {"_id": 0}).sort("timestamp", 1))
    
    return messages

# Stats routes
@app.get("/api/stats/user")
async def get_user_stats(current_user = Depends(get_current_user)):
    if current_user["role"] == "household":
        total_pickups = db.pickups.count_documents({"user_id": current_user["id"]})
        completed_pickups = db.pickups.count_documents({"user_id": current_user["id"], "status": "collected"})
        pending_pickups = db.pickups.count_documents({"user_id": current_user["id"], "status": {"$in": ["pending", "assigned", "on_the_way"]}})
        
        return {
            "total_pickups": total_pickups,
            "completed_pickups": completed_pickups,
            "pending_pickups": pending_pickups,
            "eco_points": current_user.get("eco_points", 0)
        }
    
    elif current_user["role"] == "collector":
        total_pickups = db.pickups.count_documents({"collector_id": current_user["id"]})
        completed_pickups = db.pickups.count_documents({"collector_id": current_user["id"], "status": "collected"})
        
        # Calculate average rating
        ratings = list(db.pickups.find({"collector_id": current_user["id"], "rating": {"$exists": True}}, {"rating": 1}))
        avg_rating = sum(r["rating"] for r in ratings) / len(ratings) if ratings else 0
        
        return {
            "total_pickups": total_pickups,
            "completed_pickups": completed_pickups,
            "average_rating": round(avg_rating, 2),
            "pending_assignments": db.pickups.count_documents({"status": "pending"})
        }
    
    else:  # admin
        total_users = db.users.count_documents({"role": "household"})
        total_collectors = db.users.count_documents({"role": "collector"})
        total_pickups = db.pickups.count_documents({})
        completed_pickups = db.pickups.count_documents({"status": "collected"})
        
        return {
            "total_users": total_users,
            "total_collectors": total_collectors,
            "total_pickups": total_pickups,
            "completed_pickups": completed_pickups,
            "completion_rate": round((completed_pickups / total_pickups * 100) if total_pickups > 0 else 0, 2)
        }

# Admin routes
@app.get("/api/admin/users")
async def get_all_users(current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = list(db.users.find({}, {"_id": 0, "password": 0}))
    return users

@app.put("/api/admin/users/{user_id}/toggle")
async def toggle_user_status(user_id: str, current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"User {'activated' if new_status else 'deactivated'} successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)