import os
import sys
import hashlib
import json
import urllib.request
import csv
from datetime import datetime

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

RAW_DIR = "data/question_bank/raw"
METADATA_DIR = "data/question_bank/metadata"

SOURCES = [
    {
        "name": "ruh-ai/grafite-jee-mains-qna-no-img",
        "url": "https://huggingface.co/datasets/ruh-ai/grafite-jee-mains-qna-no-img/resolve/main/filtered_dataset.csv",
        "publisher": "Ruh AI / Grafite",
        "license": "Apache-2.0",
        "years": [2022, 2023, 2024],
        "target_file": os.path.join(RAW_DIR, "jee_mains_2022_2024_grafite.csv")
    },
    {
        "name": "PhysicsWallahAI/JEE-Main-2025-Math-Jan",
        "url": "https://huggingface.co/datasets/PhysicsWallahAI/JEE-Main-2025-Math/resolve/main/main2025-jan.jsonl",
        "publisher": "PhysicsWallah AI Research",
        "license": "Apache-2.0 / Open Access",
        "years": [2025],
        "target_file": os.path.join(RAW_DIR, "2025", "main2025-jan-math.jsonl")
    },
    {
        "name": "PhysicsWallahAI/JEE-Main-2025-Math-Apr",
        "url": "https://huggingface.co/datasets/PhysicsWallahAI/JEE-Main-2025-Math/resolve/main/main2025-apr.jsonl",
        "publisher": "PhysicsWallah AI Research",
        "license": "Apache-2.0 / Open Access",
        "years": [2025],
        "target_file": os.path.join(RAW_DIR, "2025", "main2025-apr-math.jsonl")
    },
    {
        "name": "CK0607/2025-Jee-Mains-Question",
        "url": "https://huggingface.co/datasets/CK0607/2025-Jee-Mains-Question/resolve/main/math_with_uuid.csv",
        "publisher": "CK0607",
        "license": "Apache-2.0",
        "years": [2025],
        "target_file": os.path.join(RAW_DIR, "2025", "jee_2025_jan_shifts_math.csv")
    },
    {
        "name": "EduDevCommons/JEE-Mains-Dataset-2026",
        "url": "https://huggingface.co/datasets/samyakbayar/JEEMainsDataset/resolve/main/jee_2026_shift_analysis.csv",
        "publisher": "Samyakraj Bayar / EduDevCommons",
        "license": "MIT",
        "years": [2026],
        "target_file": os.path.join(RAW_DIR, "2026", "jee_2026_shift_analysis.csv")
    }
]


def compute_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def download_file(url: str, dest_path: str) -> bool:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        print(f"  [EXISTS] {dest_path} ({os.path.getsize(dest_path)} bytes)")
        return True

    print(f"  [DOWNLOADING] {url} -> {dest_path}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp, open(dest_path, "wb") as out:
            total_bytes = 0
            while True:
                buf = resp.read(65536)
                if not buf:
                    break
                out.write(buf)
                total_bytes += len(buf)
        print(f"  [DOWNLOADED] {dest_path} ({total_bytes} bytes)")
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to download {url}: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False


def run_downloader():
    print("=" * 65)
    print("JEE InsightAI — Phase 3: Downloading & Organizing Source Material")
    print("=" * 65)

    # Ensure year-wise raw directories exist
    for yr in [2022, 2023, 2024, 2025, 2026]:
        os.makedirs(os.path.join(RAW_DIR, str(yr)), exist_ok=True)
    os.makedirs(METADATA_DIR, exist_ok=True)

    manifest = []

    for src in SOURCES:
        print(f"\nProcessing source: {src['name']}")
        ok = download_file(src["url"], src["target_file"])
        if ok:
            fsize = os.path.getsize(src["target_file"])
            fsha = compute_sha256(src["target_file"])
            manifest.append({
                "source_name": src["name"],
                "source_url": src["url"],
                "publisher": src["publisher"],
                "license": src["license"],
                "target_file": src["target_file"].replace("\\", "/"),
                "file_size_bytes": fsize,
                "sha256": fsha,
                "years_covered": src["years"],
                "retrieval_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                "status": "DOWNLOADED_AND_VERIFIED"
            })
        else:
            manifest.append({
                "source_name": src["name"],
                "source_url": src["url"],
                "publisher": src["publisher"],
                "license": src["license"],
                "status": "DOWNLOAD_FAILED"
            })

    # Save manifest
    manifest_path = os.path.join(METADATA_DIR, "source_inventory.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"\n[OK] Source inventory saved to: {manifest_path}")

    # Next: Split the multi-year grafite CSV into year-wise raw files for 2022, 2023, 2024
    grafite_file = os.path.join(RAW_DIR, "jee_mains_2022_2024_grafite.csv")
    if os.path.exists(grafite_file):
        print("\nOrganizing multi-year source into year-wise raw directories...")
        split_by_year(grafite_file)


def split_by_year(csv_file: str):
    import re
    files_by_year = {
        2022: open(os.path.join(RAW_DIR, "2022", "jee_main_2022_all_shifts.csv"), "w", encoding="utf-8", newline=""),
        2023: open(os.path.join(RAW_DIR, "2023", "jee_main_2023_all_shifts.csv"), "w", encoding="utf-8", newline=""),
        2024: open(os.path.join(RAW_DIR, "2024", "jee_main_2024_all_shifts.csv"), "w", encoding="utf-8", newline="")
    }
    writers = {}
    counts = {2022: 0, 2023: 0, 2024: 0}

    with open(csv_file, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        for y, f_out in files_by_year.items():
            writers[y] = csv.DictWriter(f_out, fieldnames=fields)
            writers[y].writeheader()

        for row in reader:
            pid = row.get("paper_id") or ""
            m = re.search(r"(2022|2023|2024)", pid)
            if m:
                yr = int(m.group(1))
                writers[yr].writerow(row)
                counts[yr] += 1

    for f_out in files_by_year.values():
        f_out.close()

    print(f"  Organized into {RAW_DIR}/2022/: {counts[2022]} questions")
    print(f"  Organized into {RAW_DIR}/2023/: {counts[2023]} questions")
    print(f"  Organized into {RAW_DIR}/2024/: {counts[2024]} questions")


if __name__ == "__main__":
    run_downloader()
