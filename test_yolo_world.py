from inference_sdk import InferenceHTTPClient

client = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key="8uvtxZId3oOxVg80LO8f"
)

# Use generic 1x1 base64 as an image dict
b64_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

import cv2
import numpy as np
import base64

# let's just write a 10x10 blank image to disk
blank_image = np.zeros((10,10,3), np.uint8)
cv2.imwrite("blank.jpg", blank_image)

try:
    result = client.run_workflow(
        workspace_name="abhay-kale",
        workflow_id="yolo-world-large-demo",
        images={"image": "blank.jpg"},
        parameters={
            "classes": ["person"]
        },
        use_cache=True
    )
    print("Result:", result)
except Exception as e:
    print("Error:", e)

