#!/usr/bin/env python3
"""Create or refresh the App Store profile for com.ooyadirect.ooyaDirect.

Uses the distribution certificate inside CM_CERTIFICATE (.p12) and the
App Store Connect API key already in the environment. Writes the profile
where Xcode and `xcode-project use-profiles` look for it.
"""

from __future__ import annotations

import base64
import json
import os
import plistlib
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

BUNDLE_ID = "com.ooyadirect.ooyaDirect"
PROFILE_NAME = "ooya-direct-appstore"
KEY_ID = os.environ["APP_STORE_CONNECT_KEY_IDENTIFIER"]
ISSUER_ID = os.environ["APP_STORE_CONNECT_ISSUER_ID"]


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def der_to_raw(sig: bytes) -> bytes:
    if not sig or sig[0] != 0x30:
        fail("Apple API 署名の形式が不正です")
    index = 1
    length = sig[index]
    index += 1
    if length & 0x80:
        count = length & 0x7F
        index += count

    def read_int(pos: int) -> tuple[bytes, int]:
        if sig[pos] != 0x02:
            fail("Apple API 署名の整数が読めません")
        size = sig[pos + 1]
        start = pos + 2
        return sig[start : start + size], start + size

    raw_r, index = read_int(index)
    raw_s, _ = read_int(index)

    def trim(value: bytes) -> bytes:
        value = value.lstrip(b"\x00")
        if len(value) > 32:
            fail("Apple API 署名が長すぎます")
        return value.rjust(32, b"\x00")

    return trim(raw_r) + trim(raw_s)


def normalize_pem(raw: str) -> str:
    text = raw.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in {"'", '"'}:
        text = text[1:-1].strip()
    if "\\n" in text and "-----BEGIN" in text:
        text = text.replace("\\n", "\n").replace("\\r", "\r")
    if "-----BEGIN" not in text:
        compact = "".join(text.split())
        try:
            decoded = base64.b64decode(compact).decode()
        except Exception:
            decoded = ""
        if "-----BEGIN" in decoded:
            text = decoded.strip()
    if "-----BEGIN" not in text or "PRIVATE KEY-----" not in text:
        fail("APP_STORE_CONNECT_PRIVATE_KEY が PEM ではありません")
    if not text.endswith("\n"):
        text += "\n"
    return text


def apple_token() -> str:
    pem = normalize_pem(os.environ.get("APP_STORE_CONNECT_PRIVATE_KEY", ""))
    key_path = Path("/tmp/AuthKey.p8")
    key_path.write_text(pem)
    key_path.chmod(0o600)
    now = int(time.time())
    header = b64url(
        json.dumps({"alg": "ES256", "kid": KEY_ID, "typ": "JWT"}, separators=(",", ":")).encode()
    )
    payload = b64url(
        json.dumps(
            {
                "iss": ISSUER_ID,
                "iat": now,
                "exp": now + 600,
                "aud": "appstoreconnect-v1",
            },
            separators=(",", ":"),
        ).encode()
    )
    signing_input = f"{header}.{payload}".encode()
    data_path = Path("/tmp/asc_signing_input.bin")
    sig_path = Path("/tmp/asc_signing_sig.der")
    data_path.write_bytes(signing_input)
    proc = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", str(key_path), "-out", str(sig_path), str(data_path)],
        capture_output=True,
        text=True,
    )
    key_path.unlink(missing_ok=True)
    data_path.unlink(missing_ok=True)
    if proc.returncode != 0:
        fail("App Store Connect API キーで署名できません")
    token = f"{header}.{payload}.{b64url(der_to_raw(sig_path.read_bytes()))}"
    sig_path.unlink(missing_ok=True)
    return token


def api(token: str, method: str, url: str, payload: dict | None = None) -> dict:
    data = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:800]
        fail(f"Apple API {method} {url} -> {error.code} {detail}")


def certificate_serial() -> str:
    password = os.environ.get("CM_CERTIFICATE_PASSWORD", "")
    p12 = Path("/tmp/certificate.p12")
    if not p12.exists():
        fail("/tmp/certificate.p12 がありません")
    proc = subprocess.run(
        ["openssl", "pkcs12", "-in", str(p12), "-nokeys", "-passin", "env:P12PASS"],
        capture_output=True,
        text=True,
        env={**os.environ, "P12PASS": password},
    )
    if proc.returncode != 0:
        proc = subprocess.run(
            ["openssl", "pkcs12", "-in", str(p12), "-nokeys", "-passin", "env:P12PASS", "-legacy"],
            capture_output=True,
            text=True,
            env={**os.environ, "P12PASS": password},
        )
    if proc.returncode != 0:
        fail("配布証明書 (.p12) を開けません")
    info = subprocess.run(
        ["openssl", "x509", "-noout", "-serial"],
        input=proc.stdout,
        capture_output=True,
        text=True,
    )
    serial = info.stdout.strip().split("=", 1)[-1].upper()
    if not serial:
        fail("証明書のシリアル番号が取れません")
    return serial


def ensure_bundle_id(token: str) -> str:
    found = api(
        token,
        "GET",
        "https://api.appstoreconnect.apple.com/v1/bundleIds"
        f"?filter[identifier]={BUNDLE_ID}&limit=5",
    )
    items = found.get("data") or []
    if items:
        print(f"bundle id exists: {BUNDLE_ID}")
        return items[0]["id"]
    created = api(
        token,
        "POST",
        "https://api.appstoreconnect.apple.com/v1/bundleIds",
        {
            "data": {
                "type": "bundleIds",
                "attributes": {
                    "name": "Ooya Direct",
                    "platform": "IOS",
                    "identifier": BUNDLE_ID,
                },
            }
        },
    )
    print(f"created bundle id: {BUNDLE_ID}")
    return created["data"]["id"]


def distribution_certificate_id(token: str, serial: str) -> str:
    listed = api(
        token,
        "GET",
        "https://api.appstoreconnect.apple.com/v1/certificates?limit=200",
    )
    for item in listed.get("data") or []:
        attributes = item.get("attributes") or {}
        cert_type = attributes.get("certificateType") or ""
        cert_serial = (attributes.get("serialNumber") or "").upper()
        if "DISTRIBUTION" in cert_type and cert_serial == serial:
            print(f"matched distribution certificate {item['id']}")
            return item["id"]
    fail(f"シリアル {serial} の Apple Distribution 証明書が Developer にありません")


def refresh_profile(token: str, bundle_resource_id: str, certificate_id: str) -> bytes:
    listed = api(
        token,
        "GET",
        "https://api.appstoreconnect.apple.com/v1/profiles"
        f"?filter[name]={PROFILE_NAME}&limit=20",
    )
    for item in listed.get("data") or []:
        name = (item.get("attributes") or {}).get("name")
        if name == PROFILE_NAME:
            api(token, "DELETE", f"https://api.appstoreconnect.apple.com/v1/profiles/{item['id']}")
            print(f"deleted old profile {PROFILE_NAME}")
    created = api(
        token,
        "POST",
        "https://api.appstoreconnect.apple.com/v1/profiles",
        {
            "data": {
                "type": "profiles",
                "attributes": {
                    "name": PROFILE_NAME,
                    "profileType": "IOS_APP_STORE",
                },
                "relationships": {
                    "bundleId": {"data": {"type": "bundleIds", "id": bundle_resource_id}},
                    "certificates": {
                        "data": [{"type": "certificates", "id": certificate_id}]
                    },
                },
            }
        },
    )
    encoded = (created.get("data") or {}).get("attributes", {}).get("profileContent")
    if not encoded:
        fail("プロファイルの中身が返りませんでした")
    print(f"created profile {PROFILE_NAME}")
    return base64.b64decode(encoded)


def install_profile(content: bytes) -> None:
    destination = Path("/tmp/ooya-direct.mobileprovision")
    destination.write_bytes(content)
    decoded = subprocess.run(
        ["openssl", "cms", "-inform", "DER", "-verify", "-noverify", "-in", str(destination)],
        capture_output=True,
    )
    if decoded.returncode != 0:
        fail("作成したプロファイルを読めません")
    profile = plistlib.loads(decoded.stdout)
    uuid = profile.get("UUID")
    if not uuid:
        fail("プロファイルに UUID がありません")
    home = Path.home() / "Library/MobileDevice/Provisioning Profiles"
    home.mkdir(parents=True, exist_ok=True)
    target = home / f"{uuid}.mobileprovision"
    target.write_bytes(content)
    print(f"installed profile {uuid}")


def main() -> None:
    token = apple_token()
    serial = certificate_serial()
    bundle_resource_id = ensure_bundle_id(token)
    certificate_id = distribution_certificate_id(token, serial)
    install_profile(refresh_profile(token, bundle_resource_id, certificate_id))


if __name__ == "__main__":
    main()
