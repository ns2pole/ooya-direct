#!/usr/bin/env python3
"""Upload local signing files to Codemagic and start ios-ipa-build.

Reads:
  .codemagic_api_token or CODEMAGIC_API_TOKEN
  firebase_defines.ios.json（なければ firebase_defines.json）
  ~/.appstoreconnect/private_keys/AuthKey_ATBD5UGJTG.p8
  codemagic-signing/distribution.p12
  codemagic-signing/.p12_password

iOS IPA には FIREBASE_APP_ID が 1:…:ios:… である必要がある。
"""

from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_ID = "ios-ipa-build"
BRANCH = "main"
TEAM_ID = "6a0277d4dfd255469450aa46"
REPOSITORY_URL = "https://github.com/ns2pole/ooya-direct"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def token() -> str:
    value = os.environ.get("CODEMAGIC_API_TOKEN", "").strip()
    candidates = [
        ROOT / ".codemagic_api_token",
        Path.home() / ".codemagic_api_token",
    ]
    for path in candidates:
        if value:
            break
        if path.exists():
            value = path.read_text().strip()
            if value:
                print(f"token: {path}")
    if not value:
        fail(
            "CODEMAGIC_API_TOKEN / プロジェクトの .codemagic_api_token / "
            "~/.codemagic_api_token のいずれかが必要です"
        )
    return value


def request(api_token: str, method: str, url: str, payload: dict | None = None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "x-auth-token": api_token,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read()
            body = json.loads(raw) if raw else {}
            return response.status, body
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        return error.code, detail


def load_firebase_defines() -> tuple[Path, dict]:
    ios_path = ROOT / "firebase_defines.ios.json"
    web_path = ROOT / "firebase_defines.json"
    path = ios_path if ios_path.exists() else web_path
    if not path.exists():
        fail("firebase_defines.ios.json または firebase_defines.json が必要です")
    defines = json.loads(path.read_text())
    app_id = str(defines.get("FIREBASE_APP_ID", "")).strip()
    if ":web:" in app_id:
        fail(
            f"{path.name} の FIREBASE_APP_ID が Web 用です ({app_id}). "
            "iOS 用 (1:…:ios:…) を firebase_defines.ios.json に置いてください"
        )
    if app_id and ":ios:" not in app_id:
        print(f"WARNING: FIREBASE_APP_ID に :ios: がありません: {app_id}")
    print(f"firebase defines: {path.name}")
    return path, defines


def load_secrets() -> dict[str, tuple[str, str]]:
    _, defines = load_firebase_defines()
    p8 = Path.home().joinpath(".appstoreconnect/private_keys/AuthKey_ATBD5UGJTG.p8").read_text()
    p12 = (ROOT / "codemagic-signing" / "distribution.p12").read_bytes()
    password = (ROOT / "codemagic-signing" / ".p12_password").read_text().strip()
    firebase_keys = [
        "FIREBASE_API_KEY",
        "FIREBASE_AUTH_DOMAIN",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_STORAGE_BUCKET",
        "FIREBASE_MESSAGING_SENDER_ID",
        "FIREBASE_APP_ID",
    ]
    secrets: dict[str, tuple[str, str]] = {
        "APP_STORE_CONNECT_PRIVATE_KEY": (p8, "ios_signing_files"),
        "CM_CERTIFICATE": (base64.b64encode(p12).decode(), "ios_signing_files"),
        "CM_CERTIFICATE_PASSWORD": (password, "ios_signing_files"),
    }
    for key in firebase_keys:
        value = str(defines.get(key, "")).strip()
        if not value:
            fail(f"Firebase defines の {key} が空です")
        secrets[key] = (value, "firebase_credentials")
    return secrets


def ensure_app(api_token: str) -> str:
    status, body = request(api_token, "GET", "https://api.codemagic.io/apps")
    if status != 200 or not isinstance(body, dict):
        fail(f"アプリ一覧を取得できません ({status})")
    matches = []
    for app in body.get("applications") or []:
        repo = app.get("repository") or {}
        html = repo.get("htmlUrl") or ""
        if "ooya-direct" in html or app.get("appName") == "ooya-direct":
            matches.append(app)
    https_apps = [
        app for app in matches
        if str((app.get("repository") or {}).get("htmlUrl") or "").startswith("https://")
    ]
    chosen = (https_apps or matches)
    if chosen:
        app = chosen[0]
        print(f"app exists: {app['_id']}")
        return app["_id"]
    status, body = request(
        api_token,
        "POST",
        "https://api.codemagic.io/apps",
        {"repositoryUrl": REPOSITORY_URL, "teamId": TEAM_ID},
    )
    if status not in {200, 201} or not isinstance(body, dict):
        fail(f"Codemagic にリポジトリを追加できません ({status}) {body}")
    app_id = body.get("_id") or (body.get("application") or {}).get("_id")
    if not app_id:
        fail(f"アプリ ID が返りませんでした: {list(body)[:8]}")
    print(f"app created: {app_id}")
    return app_id


def upsert_variables(api_token: str, app_id: str, secrets: dict[str, tuple[str, str]]) -> None:
    status, existing = request(api_token, "GET", f"https://api.codemagic.io/apps/{app_id}/variables")
    if status != 200 or not isinstance(existing, list):
        fail(f"変数一覧を取得できません ({status})")
    by_key = {item.get("key"): item for item in existing if isinstance(item, dict)}
    for key, (value, group) in secrets.items():
        current = by_key.get(key)
        payload = {"key": key, "value": value, "group": group, "secure": True}
        if current and current.get("id"):
            status, body = request(
                api_token,
                "PUT",
                f"https://api.codemagic.io/apps/{app_id}/variables/{current['id']}",
                payload,
            )
            if status not in {200, 201}:
                status, body = request(
                    api_token,
                    "POST",
                    f"https://api.codemagic.io/apps/{app_id}/variables/{current['id']}",
                    payload,
                )
        else:
            status, body = request(
                api_token,
                "POST",
                f"https://api.codemagic.io/apps/{app_id}/variables",
                payload,
            )
        if status not in {200, 201}:
            text = body if isinstance(body, str) else json.dumps(body)[:300]
            fail(f"{key} を保存できません ({status}) {text}")
        print(f"set {group}/{key}")


def start_build(api_token: str, app_id: str) -> str:
    status, body = request(
        api_token,
        "POST",
        "https://api.codemagic.io/builds",
        {"appId": app_id, "workflowId": WORKFLOW_ID, "branch": BRANCH},
    )
    if status not in {200, 201} or not isinstance(body, dict):
        fail(f"ビルドを開始できません ({status}) {body}")
    build_id = body.get("buildId") or body.get("_id")
    if not build_id:
        fail("buildId が返りませんでした")
    print(f"build: https://codemagic.io/app/{app_id}/build/{build_id}")
    return build_id


def wait_for_build(api_token: str, build_id: str) -> None:
    url = f"https://api.codemagic.io/builds/{build_id}"
    while True:
        status, body = request(api_token, "GET", url)
        if status != 200 or not isinstance(body, dict):
            print(f"poll {status}")
            time.sleep(30)
            continue
        build = body.get("build") or body
        state = build.get("status") or build.get("state") or "unknown"
        print(f"status {state}")
        if state in {"finished", "success", "completed"}:
            return
        if state in {"failed", "canceled", "cancelled", "error", "timeout"}:
            fail(f"ビルドが失敗しました ({state})")
        time.sleep(30)


def main() -> None:
    api_token = token()
    secrets = load_secrets()
    app_id = ensure_app(api_token)
    upsert_variables(api_token, app_id, secrets)
    build_id = start_build(api_token, app_id)
    if "--wait" in sys.argv:
        wait_for_build(api_token, build_id)


if __name__ == "__main__":
    main()
