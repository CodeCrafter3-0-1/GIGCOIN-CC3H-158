import os

import requests
from dotenv import load_dotenv

load_dotenv()

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

PINATA_PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
PINATA_GATEWAY_BASE_URL = "https://gateway.pinata.cloud/ipfs"


def _require_env(name: str, value: str | None) -> str:
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _pinata_headers() -> dict[str, str]:
    return {
        "pinata_api_key": _require_env("PINATA_API_KEY", PINATA_API_KEY),
        "pinata_secret_api_key": _require_env(
            "PINATA_SECRET_API_KEY",
            PINATA_SECRET_API_KEY,
        ),
        "Content-Type": "application/json",
    }


def upload_json(data: dict) -> str:
    response = requests.post(
        PINATA_PIN_JSON_URL,
        json=data,
        headers=_pinata_headers(),
        timeout=30,
    )

    if response.status_code != 200:
        raise ValueError(f"IPFS upload failed: {response.text}")

    return response.json()["IpfsHash"]


def get_ipfs_url(cid: str) -> str:
    return f"{PINATA_GATEWAY_BASE_URL}/{cid}"


def download_json(cid: str) -> dict:
    response = requests.get(get_ipfs_url(cid), timeout=30)

    if response.status_code != 200:
        raise ValueError(f"IPFS download failed: {response.text}")

    return response.json()


def fetch_json(cid: str) -> dict:
    url = get_ipfs_url(cid)
    response = requests.get(url, timeout=30)

    if response.status_code != 200:
        raise ValueError(f"IPFS download failed: {response.text}")

    return response.json()


def upload(data: bytes) -> str:
    # Backward-compatible wrapper for older callers.
    return upload_json({"data": data.decode()})
