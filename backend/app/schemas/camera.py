from pydantic import BaseModel

class CameraInfo(BaseModel):
    camera_id: str
    camera_code: str
    latitude: float
    longitude: float
    zone: str
    extension: str