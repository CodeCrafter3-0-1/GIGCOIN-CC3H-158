import os
from pathlib import Path

from crypto.decrypt import decrypt_data

# Ensure we use an absolute path relative to the project root.
CRYPTO_DIR = Path(__file__).resolve().parents[3] / "crypto"
PRIVATE_KEY_PATH = CRYPTO_DIR / "requester_priv.pem"


def decrypt_payload(payload: dict) -> str:
    with open(PRIVATE_KEY_PATH, "rb") as f:
        priv_key = f.read()

    ciphertext = bytes.fromhex(payload["ciphertext"])
    encrypted_key = bytes.fromhex(payload["encrypted_key"])
    iv = bytes.fromhex(payload["iv"])

    plaintext = decrypt_data(
        ciphertext,
        encrypted_key,
        iv,
        priv_key,
    )

    return plaintext.decode()
