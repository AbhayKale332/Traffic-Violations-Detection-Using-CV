import requests
import base64
import sys

def test_api():
    # just an empty image or generic 1x1 base64
    b64_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    
    url = "https://serverless.roboflow.com/people-detection-o4rdr/12?api_key=8uvtxZId3oOxVg80LO8f"
    res = requests.post(url, headers={"Content-Type": "application/x-www-form-urlencoded"}, data=b64_img)
    print("Status:", res.status_code)
    print("Response:", res.text)

test_api()
