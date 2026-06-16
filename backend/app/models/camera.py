from app.core.database import Base
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(UUID, primary_key=True)
    camera_code = Column(String)
    latitude = Column(String)
    longitude = Column(String)
    zone = Column(String)
    extension = Column(String)