import sys
import subprocess
subprocess.check_call([sys.executable, "-m", "pip", "install", "inference-sdk"])

from inference_sdk import InferenceHTTPClient
import logging
import httpx

# Enable debug logging for httpx
logging.basicConfig(level=logging.DEBUG)
httpx_logger = logging.getLogger("httpx")
httpx_logger.setLevel(logging.DEBUG)

client = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key="8uvtxZId3oOxVg80LO8f"
)

import cv2
import numpy as np
blank_image = np.zeros((10,10,3), np.uint8)
cv2.imwrite("blank.jpg", blank_image)

try:
    result = client.run_workflow(
        workspace_name="abhay-kale",
        workflow_id="yolo-world-large-demo",
        images={"image": "blank.jpg"},
        parameters={
            "classes": ["person","dog","cat"]
        },
        use_cache=True
    )
    print(result)
except Exception as e:
    print("Error:", e)
