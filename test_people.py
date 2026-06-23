import requests

def test_api():
    b64_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    url = "https://detect.roboflow.com/abhay-kale/people-detection-o4rdr/12?api_key=8uvtxZId3oOxVg80LO8f"
    res = requests.post(url, headers={"Content-Type": "application/x-www-form-urlencoded"}, data=b64_img)
    print("Status:", res.status_code)
    print("Response:", res.text)

test_api()
