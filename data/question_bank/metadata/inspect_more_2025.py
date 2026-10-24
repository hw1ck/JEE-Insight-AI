import urllib.request
import json

repos = ["hymanshu/jee_mains_2025_shift1", "Vyshnavi93920/jee-neet-benchmark", "Optimus-Prym/Jee_main_2025_m_22"]

for repo in repos:
    url = f"https://huggingface.co/api/datasets/{repo}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    print("=" * 60)
    print(f"Repo: {repo}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            siblings = [s.get("rfilename") for s in data.get("siblings", [])]
            print(f"Files count: {len(siblings)}")
            print("Files sample:", siblings[:10])
    except Exception as e:
        print(f"Error fetching repo metadata: {e}")
