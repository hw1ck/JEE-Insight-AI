import urllib.request
import csv
import json
import io

url = "https://huggingface.co/datasets/ruh-ai/grafite-jee-mains-qna-no-img/resolve/main/filtered_dataset.csv"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

with urllib.request.urlopen(req, timeout=30) as resp:
    wrapper = io.TextIOWrapper(resp, encoding='utf-8', errors='ignore')
    reader = csv.DictReader(wrapper)
    samples_found = {"2022": [], "2023": [], "2024": []}
    for row in reader:
        pid = row.get("paper_id") or ""
        for yr in ["2022", "2023", "2024"]:
            if yr in pid and len(samples_found[yr]) < 2:
                samples_found[yr].append(row)
        if all(len(s) >= 2 for s in samples_found.values()):
            break

for yr, samples in samples_found.items():
    print(f"\n==================== {yr} SAMPLES ====================")
    for i, s in enumerate(samples):
        print(f"\n--- Sample {i+1} ---")
        for k, v in s.items():
            val = str(v)
            if len(val) > 120:
                val = val[:120] + "... [TRUNCATED]"
            print(f"  {k}: {val}")
