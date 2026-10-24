import urllib.request
import json

repos = [
    "EduDevCommons/JEE-Mains-Dataset-includes-2026-Jan-Attempt",
    "CK0607/2025-Jee-Mains-Question",
    "EduDevCommons/JEE-MAINS-ADVANCED",
    "Reja1/jee-neet-benchmark",
    "samyakbayar/JEEMainsDataset",
    "ruh-ai/grafite-jee-mains-qna-no-img",
    "PhysicsWallahAI/JEE-Main-2025-Math",
]

for repo in repos:
    url = f"https://huggingface.co/api/datasets/{repo}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    print("=" * 60)
    print(f"Repo: {repo}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Description:", (data.get("description") or "")[:150])
            siblings = [s.get("rfilename") for s in data.get("siblings", [])]
            print(f"Files count: {len(siblings)}")
            print("Files sample:", siblings[:10])
    except Exception as e:
        print(f"Error fetching repo metadata: {e}")
