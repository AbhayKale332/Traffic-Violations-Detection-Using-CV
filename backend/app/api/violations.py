import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from app.services.violation_service import check_for_violations
from app.utils.frame_extractor import extract_frames

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}

@router.get("/")
def get_violations():
    return {"violations": []}

@router.post("/analyze-video")
def analyze_video(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Upload a valid video file")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    camera_id = f"upload-{uuid4().hex[:8]}"
    extension = Path(file.filename or "traffic-video.mp4").suffix or ".mp4"
    video_path = UPLOAD_DIR / f"{camera_id}{extension}"

    try:
        with video_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        frame_data = extract_frames(camera_id=camera_id, video_path=video_path)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Video frame extraction failed: {exc}",
        ) from exc
    finally:
        file.file.close()

    # Placeholder analysis keeps backend architecture unchanged while exposing
    # extracted-frame output for model/service integration.
    violations = [
        {
            "type": "Helmet violation",
            "confidence": 94,
            "timestamp": "00:04",
            "plate": "KA 05 MX 4412",
        },
        {
            "type": "Triple riding",
            "confidence": 89,
            "timestamp": "00:06",
            "plate": "KA 05 MX 4412",
        },
        {
            "type": "Stop-line violation",
            "confidence": 82,
            "timestamp": "00:11",
            "plate": "TN 09 BX 2381",
        },
    ]

    return {
        "video": {"filename": file.filename, "camera_id": camera_id},
        "frames": frame_data,
        "detections": [
            {"label": "Motorbike", "count": 3},
            {"label": "Cars", "count": 2},
            {"label": "People", "count": 7},
        ],
        "violations": violations,
        "summary": {
            "vehicles_detected": 5,
            "violations_found": len(violations),
            "plates_detected": 2,
            "average_confidence": round(
                sum(item["confidence"] for item in violations) / len(violations)
            ),
        },
    }
