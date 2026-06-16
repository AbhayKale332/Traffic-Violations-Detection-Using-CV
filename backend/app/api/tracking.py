from fastapi import APIRouter
from app.schemas.tracking import DetectionEvent
from app.services.tracking_service import predict_next_camera

router = APIRouter()

@router.post("/detections")
def upload_detection(event: DetectionEvent):
    # This is where the AI sends data
    return {"status": "Event received", "event": event}

@router.get("/predict/{plate}")
def get_prediction(plate: str):
    return predict_next_camera(plate, "CAM-CURRENT")