import urllib.request
import urllib.parse
import json

queries = ['jee-main', 'jee main', 'jee 2024', 'jee 2023', 'jee 2025', 'jee 2022', 'jee benchmark']
found = {}

for q in queries:
    url = f"https://huggingface.co/api/datasets?search={urllib.parse.quote(q)}&limit=100"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            items = json.loads(response.read().decode('utf-8'))
            for item in items:
                did = item.get('id')
                if did not in found:
                    found[did] = item
    except Exception as e:
        print(f"Error searching {q}: {e}")

print(f"Total matching Hugging Face datasets found: {len(found)}")
for did, item in sorted(found.items()):
    downloads = item.get('downloads', 0)
    tags = item.get('tags', [])[:5]
    print(f"- {did} (downloads: {downloads})")
