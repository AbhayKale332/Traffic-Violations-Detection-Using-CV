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

def extract_frames(camera_id, video_path, output_dir=BASE_DIR / "data" / "frames"):
    output_dir = Path(output_dir) / camera_id
    output_dir.mkdir(parents=True, exist_ok=True)
    
    FRAME_NAME = "frame"
    EXTENSION = "jpg"
    
    # Define the output pattern (e.g., frame_0001.jpg)
    output_pattern = str(output_dir / f"{FRAME_NAME}_%04d.{EXTENSION}")

    # Build the FFmpeg command
    command = [
        "ffmpeg",
        "-i", str(video_path),
        "-vf", "fps=1",
        "-q:v", "5",
        "-hide_banner", "-loglevel", "error", # Keep terminal output clean
        output_pattern
    ]

    # Run the command
    subprocess.run(command, check=True)

    # Post-process extracted frames
    frames = list(output_dir.glob(f"*.{EXTENSION}"))
    for frame_path in frames:
        preprocess_frame(frame_path)

    saved_count = len(frames)

    return {
        "folder_path": str(output_dir),
        "frame_name": FRAME_NAME,
        "extension": EXTENSION,
        "count": saved_count
    }