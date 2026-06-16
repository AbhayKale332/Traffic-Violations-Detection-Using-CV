import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

def extract_frames(camera_id, video_path, output_dir=BASE_DIR / "data" / "frames"):
    output_dir = Path(output_dir) / camera_id
    output_dir.mkdir(parents=True, exist_ok=True)
    
    FRAME_NAME = "frame"
    EXTENSION = "jpg"
    
    # Define the output pattern (e.g., frame_0001.jpg)
    output_pattern = str(output_dir / f"{FRAME_NAME}_%04d.{EXTENSION}")

    # Build the FFmpeg command
    # -i: input file
    # -vf fps=1: extract exactly 1 frame per second
    # -q:v 2: high quality JPEG output
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

    # Count how many files were generated
    saved_count = len(list(output_dir.glob(f"*.{EXTENSION}")))

    return {
        "folder_path": str(output_dir),
        "frame_name": FRAME_NAME,
        "extension": EXTENSION,
        "count": saved_count
    }