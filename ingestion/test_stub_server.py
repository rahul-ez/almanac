#!/usr/bin/env python3
"""
Test Stub Server & CLI Validator for Campus Companion Attendance Ingestion

This standalone script provides:
1. A lightweight mock server implementing the POST /api/ingest/attendance contract.
2. A built-in test client that sends valid and invalid payloads to verify contract behavior.

Usage:
  Run server:       python ingestion/test_stub_server.py --port 8080
  Run test suite:   python ingestion/test_stub_server.py --test-suite
"""

import sys
import json
import argparse
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError

EXPECTED_TOKEN = "shared-ingestion-secret"
VALID_EVENT_IDS = {"evt_001", "evt_002", "evt_003", "evt_004", "evt_005"}
_ATTENDANCE_COUNTER = 1000

class IngestionStubHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        global _ATTENDANCE_COUNTER
        if self.path != "/api/ingest/attendance":
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "not_found"}).encode("utf-8"))
            return

        content_length = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_length)

        try:
            payload = json.loads(post_body.decode("utf-8"))
        except Exception:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "invalid_json"}).encode("utf-8"))
            return

        # 1. Token validation (401 Unauthorized)
        token = payload.get("token")
        if not token or token != EXPECTED_TOKEN:
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "unauthorized"}).encode("utf-8"))
            return

        # 2. Event ID validation (404 Unknown Event)
        event_id = payload.get("event_id")
        if not event_id or event_id not in VALID_EVENT_IDS:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "unknown_event"}).encode("utf-8"))
            return

        # 3. Required fields validation
        name = payload.get("registrant_name")
        email = payload.get("registrant_email")
        submitted_at = payload.get("submitted_at")

        if not name or not email or not submitted_at:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "missing_required_fields"}).encode("utf-8"))
            return

        # 4. Success response (201 Created)
        _ATTENDANCE_COUNTER += 1
        attendance_id = f"att_{_ATTENDANCE_COUNTER}"
        
        response_body = {
            "status": "ok",
            "attendance_id": attendance_id
        }

        self.send_response(201)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(response_body).encode("utf-8"))

    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[StubServer] {args[0]} - {args[1]} - {args[2]}\n")


def run_test_suite(server_url: str) -> bool:
    """Run automated contract validation suite against the target URL."""
    endpoint = f"{server_url}/api/ingest/attendance"
    print(f"\n--- Running Ingestion Contract Test Suite against {endpoint} ---")
    all_passed = True

    # Test Case 1: Valid Ingestion Request -> HTTP 201
    payload_valid = {
        "token": "shared-ingestion-secret",
        "event_id": "evt_001",
        "registrant_name": "Aditi Sharma",
        "registrant_email": "aditi.sharma@campus.edu",
        "submitted_at": "2026-09-05T14:58:00"
    }
    req = Request(endpoint, data=json.dumps(payload_valid).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        with urlopen(req) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            if resp.status == 201 and body.get("status") == "ok" and "attendance_id" in body:
                print("  [PASS] Test 1: Valid submission returned HTTP 201 ok:", body)
            else:
                print(f"  [FAIL] Test 1: Expected 201 ok, got status {resp.status}, body: {body}")
                all_passed = False
    except Exception as e:
        print("  [FAIL] Test 1 Exception:", e)
        all_passed = False

    # Test Case 2: Invalid Token -> HTTP 401
    payload_bad_token = {
        "token": "wrong-secret-token",
        "event_id": "evt_001",
        "registrant_name": "Aditi Sharma",
        "registrant_email": "aditi.sharma@campus.edu",
        "submitted_at": "2026-09-05T14:58:00"
    }
    req = Request(endpoint, data=json.dumps(payload_bad_token).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        urlopen(req)
        print("  [FAIL] Test 2: Expected HTTP 401, but request succeeded.")
        all_passed = False
    except HTTPError as e:
        body = json.loads(e.read().decode("utf-8"))
        if e.code == 401 and body.get("status") == "unauthorized":
            print("  [PASS] Test 2: Invalid token returned HTTP 401 unauthorized:", body)
        else:
            print(f"  [FAIL] Test 2: Expected 401 unauthorized, got {e.code}: {body}")
            all_passed = False
    except Exception as e:
        print("  [FAIL] Test 2 Exception:", e)
        all_passed = False

    # Test Case 3: Unknown Event ID -> HTTP 404
    payload_bad_event = {
        "token": "shared-ingestion-secret",
        "event_id": "evt_999",
        "registrant_name": "Aditi Sharma",
        "registrant_email": "aditi.sharma@campus.edu",
        "submitted_at": "2026-09-05T14:58:00"
    }
    req = Request(endpoint, data=json.dumps(payload_bad_event).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        urlopen(req)
        print("  [FAIL] Test 3: Expected HTTP 404, but request succeeded.")
        all_passed = False
    except HTTPError as e:
        body = json.loads(e.read().decode("utf-8"))
        if e.code == 404 and body.get("status") == "unknown_event":
            print("  [PASS] Test 3: Unknown event returned HTTP 404 unknown_event:", body)
        else:
            print(f"  [FAIL] Test 3: Expected 404 unknown_event, got {e.code}: {body}")
            all_passed = False
    except Exception as e:
        print("  [FAIL] Test 3 Exception:", e)
        all_passed = False

    print("\n--- Summary ---")
    if all_passed:
        print("ALL INGESTION CONTRACT TESTS PASSED!")
    else:
        print("SOME TESTS FAILED.")
    return all_passed


def main():
    parser = argparse.ArgumentParser(description="Campus Companion Attendance Ingestion Stub & Test Tool")
    parser.add_argument("--port", type=int, default=8080, help="Port to run stub server on")
    parser.add_argument("--test-suite", action="store_true", help="Launch background server and run test suite")
    parser.add_argument("--target-url", type=str, default=None, help="Run test suite against a specific external URL")

    args = parser.parse_args()

    if args.target_url:
        success = run_test_suite(args.target_url)
        sys.exit(0 if success else 1)

    if args.test_suite:
        server = HTTPServer(("127.0.0.1", args.port), IngestionStubHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        time.sleep(0.5)

        success = run_test_suite(f"http://127.0.0.1:{args.port}")
        server.shutdown()
        sys.exit(0 if success else 1)

    print(f"Starting Ingestion Stub Server on port {args.port}...")
    print(f"Endpoint: http://127.0.0.1:{args.port}/api/ingest/attendance")
    server = HTTPServer(("0.0.0.0", args.port), IngestionStubHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Ingestion Stub Server.")
        server.server_close()


if __name__ == "__main__":
    main()
