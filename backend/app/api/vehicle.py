from fastapi import APIRouter
from app.schemas.vehicle import VehicleCreate

router = APIRouter()

@router.post("/watchlist")
def add_to_watchlist(vehicle: VehicleCreate):
    return {"message": "Vehicle added to watchlist", "data": vehicle}