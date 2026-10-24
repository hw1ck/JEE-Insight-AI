import urllib.request
import json
import zipfile
import io

print("--- Inspecting PhysicsWallahAI/JEE-Main-2025-Math ---")
pw_url = "https://huggingface.co/datasets/PhysicsWallahAI/JEE-Main-2025-Math/resolve/main/main2025-jan.jsonl"
req = urllib.request.Request(pw_url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        first_few = [resp.readline().decode('utf-8') for _ in range(3)]
        for i, l in enumerate(first_few):
            obj = json.loads(l)
            print(f"Sample {i}:", json.dumps(obj, indent=2)[:400])
except Exception as e:
    print("PW error:", e)

print("\n--- Inspecting EduDevCommons/JEE-Mains-Dataset-includes-2026-Jan-Attempt README ---")
ed_url = "https://huggingface.co/datasets/EduDevCommons/JEE-Mains-Dataset-includes-2026-Jan-Attempt/resolve/main/README.md"
req2 = urllib.request.Request(ed_url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req2, timeout=10) as resp2:
        print(resp2.read().decode('utf-8')[:600])
except Exception as e:
    print("EduDev README error:", e)
