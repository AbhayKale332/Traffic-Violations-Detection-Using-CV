from fastapi import APIRouter

router = APIRouter()

@router.get("/dashboard")
def get_dashboard_stats():
    return {"total_tracked": 0, "active_alerts": 0}