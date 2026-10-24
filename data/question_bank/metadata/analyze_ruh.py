import urllib.request
import csv
import re
from collections import Counter

url = "https://huggingface.co/datasets/ruh-ai/grafite-jee-mains-qna-no-img/resolve/main/filtered_dataset.csv"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

print("Streaming ruh-ai filtered_dataset.csv to analyze paper_ids and years...")
years_counter = Counter()
paper_counter = Counter()
subj_counter = Counter()
total_rows = 0

with urllib.request.urlopen(req, timeout=60) as resp:
    # Use TextIOWrapper with utf-8
    import io
    wrapper = io.TextIOWrapper(resp, encoding='utf-8', errors='ignore')
    reader = csv.DictReader(wrapper)
    for row in reader:
        total_rows += 1
        pid = row.get("paper_id") or ""
        subj = row.get("subject") or ""
        subj_counter[subj] += 1
        paper_counter[pid] += 1
        
        # Extract year
        m = re.search(r"(20\d\d)", pid)
        if m:
            yr = m.group(1)
            years_counter[yr] += 1
        else:
            years_counter["unknown"] += 1

print(f"Total rows in ruh-ai dataset: {total_rows}")
print("Subjects:", dict(subj_counter))
print("Year distribution:")
for yr, cnt in sorted(years_counter.items()):
    print(f"  {yr}: {cnt}")

print("\nSample papers from 2022, 2023, 2024, 2025:")
for p, c in sorted(paper_counter.items()):
    if any(y in p for y in ["2022", "2023", "2024", "2025", "2026"]):
        print(f"  {p}: {c} questions")
