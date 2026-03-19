import urllib.request
import json
try:
    data = json.loads(urllib.request.urlopen('https://ipurushottam-climai.hf.space/tsunamis?_t=123').read().decode())
    print(f'Total events from HF: {data["summary"]["total"]}')
    print(f'First event: {data["events"][0]}')
except Exception as e:
    print(f"Error: {e}")
