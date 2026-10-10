"""Measure live HTTP latency; no invented benchmark figures."""
import argparse
import json
import statistics
import time
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:8000')
parser.add_argument('--runs', type=int, default=5)
args = parser.parse_args()
url = args.base_url.rstrip('/') + '/api/dashboard?start=2011-09-11&end=2011-12-09&interval=weekly'
timings = []
for _ in range(args.runs):
    start = time.perf_counter()
    with urllib.request.urlopen(url, timeout=30) as response:
        payload = json.load(response)
    timings.append(round((time.perf_counter() - start) * 1000, 2))
print(json.dumps({'url': url, 'runs_ms': timings, 'first_ms': timings[0], 'subsequent_median_ms': statistics.median(timings[1:]) if len(timings) > 1 else None, 'qualifying_rows': payload['overview']['rows']}, indent=2))
