import time
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:5179"

ENDPOINTS = [
    {"name": "List Trips", "method": "GET", "path": "/api/Trips", "payload": None, "iterations": 10},
    {"name": "Get Trip Context (Trip 2)", "method": "GET", "path": "/api/Trips/2", "payload": None, "iterations": 10},
    {"name": "List Expenses (Trip 2)", "method": "GET", "path": "/api/Expenses/trip/2", "payload": None, "iterations": 10},
    {"name": "Get Weather Telemetry", "method": "GET", "path": "/api/Risk/weather/trip/2", "payload": None, "iterations": 5},
    {"name": "Run LangGraph AI Workflow", "method": "POST", "path": "/api/Workflow/trip/2/run", "payload": b"", "iterations": 3},
]

def benchmark():
    print("=" * 75)
    print(" TravelWise API Lightweight Performance Benchmark (SE3090 Viva Suite)")
    print("=" * 75)
    print(f"{'Endpoint':<32} | {'Calls':<5} | {'Avg (ms)':<9} | {'Min (ms)':<9} | {'Max (ms)':<9} | {'Fail %':<6}")
    print("-" * 75)

    for item in ENDPOINTS:
        latencies = []
        failures = 0
        url = f"{BASE_URL}{item['path']}"

        for _ in range(item["iterations"]):
            start = time.perf_counter()
            try:
                req = urllib.request.Request(
                    url,
                    data=item["payload"],
                    method=item["method"],
                    headers={"Content-Type": "application/json"} if item["payload"] is not None else {}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    if resp.status >= 400:
                        failures += 1
            except Exception:
                failures += 1
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            latencies.append(elapsed_ms)

        avg_ms = sum(latencies) / len(latencies)
        min_ms = min(latencies)
        max_ms = max(latencies)
        fail_pct = (failures / item["iterations"]) * 100.0

        print(f"{item['name']:<32} | {item['iterations']:<5} | {avg_ms:8.2f}  | {min_ms:8.2f}  | {max_ms:8.2f}  | {fail_pct:5.1f}%")

    print("=" * 75)
    print(" Benchmark completed successfully.")

if __name__ == "__main__":
    benchmark()
