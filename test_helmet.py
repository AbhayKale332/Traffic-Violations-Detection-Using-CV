import requests
import base64
import sys
import json

def test_api():
    # fetch the exact image from the screenshot via frontend
    # the frontend has the image f1616256214077f8c5a7ef230328bbbf.jpg
    # let's just upload a sample image from the internet
    url = "https://detect.roboflow.com/helmet-detection-zktr7/5?api_key=8uvtxZId3oOxVg80LO8f"
    
    # try to use the image from frontend/public or somewhere?
    # I'll just use a generic blank image, it's fine. Wait, it might not detect anything.
    b64_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    res = requests.post(url, headers={"Content-Type": "application/x-www-form-urlencoded"}, data=b64_img)
    print("Helmet API Status:", res.status_code)
    try:
        print(json.dumps(res.json(), indent=2))
    except:
        pass

test_api()
