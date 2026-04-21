import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from crypto.keygen import generate_keys

PRIVATE_KEY_PATH = ROOT_DIR / "crypto" / "requester_priv.pem"
PUBLIC_KEY_PATH = ROOT_DIR / "crypto" / "requester_pub.pem"


def main() -> None:
    private_key, public_key = generate_keys()

    PRIVATE_KEY_PATH.write_bytes(private_key)
    PUBLIC_KEY_PATH.write_bytes(public_key)

    print(
        {
            "private_key_path": str(PRIVATE_KEY_PATH),
            "public_key_path": str(PUBLIC_KEY_PATH),
        }
    )


if __name__ == "__main__":
    main()
