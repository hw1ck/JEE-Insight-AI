import urllib.request

urls = [
    "https://huggingface.co/datasets/PhysicsWallahAI/JEE-Main-2025-Math/resolve/main/main2025-jan.jsonl",
    "https://huggingface.co/datasets/PhysicsWallahAI/JEE-Main-2025-Math/resolve/main/main2025-apr.jsonl",
    "https://huggingface.co/datasets/CK0607/2025-Jee-Mains-Question/resolve/main/math_with_uuid.csv"
]
for u in urls:
    req = urllib.request.Request(u, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            cl = resp.headers.get('Content-Length')
            print(f"{u.split('/')[-1]}: {cl} bytes ({int(cl)/1024:.1f} KB)")
    except Exception as e:
        print(e)
