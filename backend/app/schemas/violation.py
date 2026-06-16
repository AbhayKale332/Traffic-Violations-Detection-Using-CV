from pydantic import BaseModel

class ViolationReport(BaseModel):
    plate: str
    violation_type: str