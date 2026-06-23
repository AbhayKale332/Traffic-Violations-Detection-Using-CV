import subprocess
from pathlib import Path
import cv2
import numpy as np

BASE_DIR = Path(__file__).resolve().parents[2]

def preprocess_frame(img_path):
    img = cv2.imread(str(img_path))
    if img is None:
        return
        
    # Gamma Correction & CLAHE (Low Light & Shadow Fix)
    gamma = 1.2
    invGamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** invGamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    gamma_corrected = cv2.LUT(img, table)
    
    lab = cv2.cvtColor(gamma_corrected, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    enhanced = cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2BGR)
    
    # Bilateral Filter & Unsharp Masking (Weather & Blur Reduction)
    denoised_bilateral = cv2.bilateralFilter(enhanced, d=5, sigmaColor=25, sigmaSpace=25)
    gaussian = cv2.GaussianBlur(denoised_bilateral, (0, 0), 1.5)
    final_output = cv2.addWeighted(denoised_bilateral, 1.2, gaussian, -0.2, 0)
    
    cv2.imwrite(str(img_path), final_output)

def extract_frames(camera_id, video_path, fps: float = 1.0, output_dir=BASE_DIR / "data" / "frames"):
    """
    Extract frames from a video at the given fps rate, then apply the full
    preprocessing pipeline (gamma correction, CLAHE, bilateral filter, unsharp mask)
    to each frame.

    Args:
        camera_id:  Unique ID used to namespace the output folder.
        video_path: Path to the source video file.
        fps:        Frames per second to extract. Default 1.0.
        output_dir: Root directory where frame folders are created.

    Returns:
        dict with folder_path, frame_name, extension, count, and fps_used.
    """
    output_dir = Path(output_dir) / camera_id
    output_dir.mkdir(parents=True, exist_ok=True)
    
    FRAME_NAME = "frame"
    EXTENSION = "jpg"
    
    # Define the output pattern (e.g., frame_0001.jpg)
    output_pattern = str(output_dir / f"{FRAME_NAME}_%04d.{EXTENSION}")

    # Build the FFmpeg command with the user-supplied fps
    command = [
        "ffmpeg",
        "-i", str(video_path),
        "-vf", f"fps={fps}",
        "-q:v", "5",
        "-hide_banner", "-loglevel", "error",
        output_pattern
    ]

    # Run the command
    subprocess.run(command, check=True)

    # Post-process extracted frames
    frames = sorted(Path(output_dir).glob(f"*.{EXTENSION}"))
    for frame_path in frames:
        preprocess_frame(frame_path)

    saved_count = len(frames)

    return {
        "folder_path": str(output_dir),
        "frame_name": FRAME_NAME,
        "extension": EXTENSION,
        "count": saved_count,
        "fps_used": fps,
    }