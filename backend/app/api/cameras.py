from fastapi import APIRouter
from app.utils import camera_detector, frame_extractor

router = APIRouter()

@router.get("/")
def get_all_cameras():
    data = []
    cameras, video_dir = camera_detector.detect_cameras()
    
    for camera in cameras:
        data.append(frame_extractor.extract_frames(camera.get("camera_code"), video_dir / f"{camera.get('camera_code')}.{camera.get('extension')}"))
    
    return {"cameras": cameras, "frames": data}