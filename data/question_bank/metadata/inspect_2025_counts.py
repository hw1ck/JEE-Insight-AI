import urllib.request
import csv
import json

print("--- Inspecting CK0607/2025-Jee-Mains-Question math_with_uuid.csv ---")
url1 = "https://huggingface.co/datasets/CK0607/2025-Jee-Mains-Question/resolve/main/math_with_uuid.csv"
req1 = urllib.request.Request(url1, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req1, timeout=15) as r:
        import io
        wrapper = io.TextIOWrapper(r, encoding='utf-8', errors='ignore')
        reader = csv.DictReader(wrapper)
        shifts = set()
        count = 0
        for row in reader:
            count += 1
            shifts.add(row.get("Shift Name"))
        print(f"CK0607 total rows: {count}")
        print(f"Shifts ({len(shifts)}):", list(shifts)[:10])
except Exception as e:
    print("CK0607 error:", e)

print("\n--- Inspecting PhysicsWallahAI/JEE-Main-2025-Math ---")
for split in ["jan", "apr"]:
    u = f"https://huggingface.co/datasets/PhysicsWallahAI/JEE-Main-2025-Math/resolve/main/main2025-{split}.jsonl"
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=15) as r:
            lines = r.readlines()
            print(f"PW 2025 {split} lines: {len(lines)}")
    except Exception as e:
        print(f"PW {split} error:", e)
