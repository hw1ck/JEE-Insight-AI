import urllib.request
import zipfile
import io

url = "https://huggingface.co/datasets/EduDevCommons/JEE-Mains-Dataset-includes-2026-Jan-Attempt/resolve/main/JEE%20Mains%20Dataset%20(includes%202026%20Jan%20Attempt).zip"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    print("Fetching zip...")
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read()
        print(f"Downloaded zip size: {len(content)} bytes")
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            print("Zip files:", z.namelist())
except Exception as e:
    print("Error:", e)
