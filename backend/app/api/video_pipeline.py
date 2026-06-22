import base64
import shutil
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.utils.frame_extractor import extract_frames

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/avi"}

MAX_FRAMES_RETURNED = 30  # Cap to avoid huge payloads


def encode_image(img: np.ndarray) -> str:
    """Encode an OpenCV image to a base64 JPEG data-URI."""
    _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"


@router.post("/extract-frames")
async def extract_video_frames(file: UploadFile = File(...)):
    """
    Accept a video file, run the frame extraction + preprocessing pipeline,
    and return the extracted frames as base64 images along with metadata.

    Frames are already preprocessed (gamma correction, CLAHE, bilateral filter,
    unsharp masking) by the frame_extractor utility — they are ready for
    downstream model inference.
    """
    content_type = (file.content_type or "").split(";")[0].strip()
    if content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Upload a valid video file. Got: {content_type}",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    camera_id = f"vid-{uuid4().hex[:8]}"
    extension = Path(file.filename or "video.mp4").suffix or ".mp4"
    video_path = UPLOAD_DIR / f"{camera_id}{extension}"

    try:
        # Save uploaded video to disk
        with video_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run extraction + preprocessing (uses ffmpeg @ 1fps, then applies CV pipeline)
        frame_data = extract_frames(camera_id=camera_id, video_path=video_path)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Frame extraction failed: {exc}",
        ) from exc
    finally:
        file.file.close()

    folder = Path(frame_data["folder_path"])
    extension_glob = frame_data["extension"]
    frame_files = sorted(folder.glob(f"*.{extension_glob}"))

    # Limit number of frames returned to avoid payload bloat
    step = max(1, len(frame_files) // MAX_FRAMES_RETURNED)
    selected_frames = frame_files[::step][:MAX_FRAMES_RETURNED]

    frames_b64 = []
    for frame_path in selected_frames:
        img = cv2.imread(str(frame_path))
        if img is not None:
            frames_b64.append(encode_image(img))

    return JSONResponse(
        content={
            "camera_id": camera_id,
            "total_frames_extracted": frame_data["count"],
            "frames_returned": len(frames_b64),
            "fps_extracted": 1,
            "frames": frames_b64,  # List of base64 JPEG data-URIs (already preprocessed)
        }
    )
