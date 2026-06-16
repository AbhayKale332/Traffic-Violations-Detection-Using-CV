from importlib.resources import path
import os
from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parents[2]

def detect_cameras(Location = BASE_DIR / "data"):
    video_files = []

    data = Path(Location) / "data.json"
    with open(data, 'r') as f:
        camera_data = json.load(f)

    Video_dir = Location / "Videos"

    for camera in camera_data:
        camera_id = camera.get("camera_code")
        extension = camera.get("extension")  # Default to mp4 if not specified
        if f"{camera_id}.{extension}" in os.listdir(Video_dir):
            video_files.append(camera)
        else:
            print(f"Warning: Video file for camera {camera_id} not found in {Video_dir} Started Downloading File")
            print(f"Downloading {camera_id}.{extension} from {camera.get('video_url')}")
            print("nahi ho raha bhai download yeh le link khud kr le : ) bara bar folder meh dalna file")
            print(f"Link: {camera.get('video_url')}")

    return video_files, Video_dir