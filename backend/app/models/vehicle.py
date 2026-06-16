from sqlalchemy import Column, String
from app.core.database import Base

class Vehicle(Base):
    __tablename__ = "vehicles"
    # id = Column(UUID, primary_key=True)
    # plate_number = Column(String)
    pass