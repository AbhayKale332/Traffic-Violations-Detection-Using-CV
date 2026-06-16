from pydantic import BaseModel

class DetectionEvent(BaseModel):
    camera_id: str
    plate: str
    confidence: float