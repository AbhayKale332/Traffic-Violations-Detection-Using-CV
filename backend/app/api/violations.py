from fastapi import APIRouter
from app.services.violation_service import check_for_violations

router = APIRouter()

@router.get("/")
def get_violations():
    return {"violations": []}