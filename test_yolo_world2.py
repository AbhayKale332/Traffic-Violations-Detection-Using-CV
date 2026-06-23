import requests
import json
import base64

def test_api():
    b64_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    url = "https://detect.roboflow.com/infer/workflows/abhay-kale/yolo-world-large-demo?api_key=8uvtxZId3oOxVg80LO8f"
    payload = {
        "inputs": {
            "image": {
                "type": "base64",
                "value": b64_img
            },
            "classes": ["person"]
        }
    }
    res = requests.post(url, json=payload)
    print("Status:", res.status_code)
    try:
        print(json.dumps(res.json(), indent=2))
    except:
        print(res.text)

test_api()
