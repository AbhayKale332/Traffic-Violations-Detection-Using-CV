from pydantic import BaseModel

class VehicleCreate(BaseModel):
    plate_number: str
    vehicle_type: str