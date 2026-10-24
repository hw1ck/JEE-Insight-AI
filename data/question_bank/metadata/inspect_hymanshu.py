import urllib.request

u = "https://huggingface.co/datasets/hymanshu/jee_mains_2025_shift1/raw/main/README.md"
try:
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=10) as r:
        print(r.read().decode('utf-8'))
except Exception as e:
    print(e)
