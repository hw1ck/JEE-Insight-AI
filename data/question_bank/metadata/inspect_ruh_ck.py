import urllib.request
import json

print("--- Inspecting ruh-ai/grafite-jee-mains-qna-no-img README ---")
url1 = "https://huggingface.co/datasets/ruh-ai/grafite-jee-mains-qna-no-img/raw/main/README.md"
req1 = urllib.request.Request(url1, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req1, timeout=10) as r1:
        print(r1.read().decode('utf-8')[:600])
except Exception as e:
    print("Error 1:", e)

print("\n--- Inspecting CK0607/2025-Jee-Mains-Question README / sample ---")
url2 = "https://huggingface.co/datasets/CK0607/2025-Jee-Mains-Question/raw/main/README.md"
req2 = urllib.request.Request(url2, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req2, timeout=10) as r2:
        print(r2.read().decode('utf-8')[:600])
except Exception as e:
    print("Error 2:", e)

url3 = "https://huggingface.co/datasets/CK0607/2025-Jee-Mains-Question/resolve/main/math_with_uuid.csv"
req3 = urllib.request.Request(url3, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req3, timeout=10) as r3:
        for _ in range(5):
            print("CSV line:", r3.readline().decode('utf-8').strip())
except Exception as e:
    print("Error 3:", e)
