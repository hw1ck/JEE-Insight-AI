import urllib.request

url = "https://huggingface.co/datasets/ruh-ai/grafite-jee-mains-qna-no-img/resolve/main/filtered_dataset.csv"
req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        cl = resp.headers.get('Content-Length')
        print(f"Content-Length: {cl} bytes ({int(cl)/(1024*1024):.2f} MB)")
except Exception as e:
    print(e)
