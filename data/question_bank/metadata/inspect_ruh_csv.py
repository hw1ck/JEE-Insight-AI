import urllib.request
import io
import csv

url = "https://huggingface.co/datasets/ruh-ai/grafite-jee-mains-qna-no-img/resolve/main/filtered_dataset.csv"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    print("Reading first 100 rows of ruh-ai filtered_dataset.csv...")
    with urllib.request.urlopen(req, timeout=15) as r:
        lines = [r.readline().decode('utf-8', errors='ignore') for _ in range(50)]
        reader = csv.DictReader(lines)
        print("Fields:", reader.fieldnames)
        years = set()
        papers = set()
        for i, row in enumerate(reader):
            pid = row.get("paper_id", "")
            papers.add(pid)
            if i < 3:
                print(f"Row {i}: subj={row.get('subject')}, paper={pid}, q={row.get('question')[:80]}")
        print("Sample paper_ids:", list(papers)[:10])
except Exception as e:
    print("Error:", e)
