import urllib.request
import json

def fetch_tree(repo):
    url = f"https://huggingface.co/api/datasets/{repo}/tree/main?recursive=true"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            items = json.loads(resp.read().decode('utf-8'))
            return [it.get("path") for it in items if it.get("type") == "file"]
    except Exception as e:
        print(f"Error tree {repo}: {e}")
        return []

files_reja1 = fetch_tree("Reja1/jee-neet-benchmark")
print("Reja1 files count:", len(files_reja1))
data_files = [f for f in files_reja1 if f.endswith(".json") or f.endswith(".jsonl") or f.endswith(".csv") or f.endswith(".yaml")]
print("Data/config files in Reja1:")
for df in data_files:
    print(" ", df)
