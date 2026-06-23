import base64
import shutil
from pathlib import Path
from uuid import uuid4
from typing import Annotated

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.utils.frame_extractor import extract_frames

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/webm", "video/quicktime",
    "video/x-msvideo", "video/avi", "video/ogg",
    "video/x-matroska",  # .mkv
    "application/octet-stream",  # some browsers send this for video files
}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".ogv", ".m4v"}

# Hard cap: never return more than 120 frames to keep the payload manageable.
# At 2 fps on a 60-second clip that's already 120 frames, which is plenty.
MAX_FRAMES_RETURNED = 120


def encode_image(img: np.ndarray) -> str:
    """Encode an OpenCV image to a base64 JPEG data-URI."""
    _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 82])
    return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"


@router.post("/extract-frames")
async def extract_video_frames(
    file: UploadFile = File(...),
    fps: Annotated[float, Form()] = 1.0,
):
    """
    Accept a video file, extract frames at the requested fps rate, apply the
    full preprocessing pipeline (gamma correction, CLAHE, bilateral filter,
    unsharp masking) to each frame, and return the results as base64 images.

    Form fields
    -----------
    file : video file (mp4 / webm / quicktime / avi)
    fps  : frames per second to extract — float, e.g. 0.5, 1, 2, 4 (default 1)
    """
    # Validate fps range
    if not (0.1 <= fps <= 10):
        raise HTTPException(status_code=400, detail="fps must be between 0.1 and 10")

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    file_ext = Path(file.filename or "").suffix.lower()

    # Accept if content-type is a known video type, starts with 'video/',
    # or is generic (octet-stream) but the file extension is a known video format.
    type_ok = (
        content_type in ALLOWED_VIDEO_TYPES
        or content_type.startswith("video/")
        or (content_type == "application/octet-stream" and file_ext in ALLOWED_VIDEO_EXTENSIONS)
    )
    if not type_ok:
        raise HTTPException(
            status_code=400,
            detail=f"Upload a valid video file (mp4, webm, mov, avi, mkv). Got content-type: {content_type}, extension: {file_ext}",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    camera_id = f"vid-{uuid4().hex[:8]}"
    extension = Path(file.filename or "video.mp4").suffix or ".mp4"
    video_path = UPLOAD_DIR / f"{camera_id}{extension}"

    try:
        # Save uploaded video to disk
        with video_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run extraction + preprocessing with user-supplied fps
        frame_data = extract_frames(
            camera_id=camera_id,
            video_path=video_path,
            fps=fps,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Frame extraction failed: {exc}",
        ) from exc
    finally:
        file.file.close()

    folder = Path(frame_data["folder_path"])
    ext = frame_data["extension"]
    frame_files = sorted(folder.glob(f"*.{ext}"))

    # If we extracted more than the cap, sample evenly to stay under it
    total = len(frame_files)
    if total > MAX_FRAMES_RETURNED:
        step = total // MAX_FRAMES_RETURNED
        frame_files = frame_files[::step][:MAX_FRAMES_RETURNED]

    frames_b64: list[str] = []
    for frame_path in frame_files:
        img = cv2.imread(str(frame_path))
        if img is not None:
            frames_b64.append(encode_image(img))

    return JSONResponse(
        content={
            "camera_id": camera_id,
            "total_frames_extracted": frame_data["count"],
            "frames_returned": len(frames_b64),
            "fps_extracted": fps,
            "frames": frames_b64,
        }
    )
