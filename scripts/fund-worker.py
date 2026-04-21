import json
import os
from pathlib import Path

from dotenv import load_dotenv
from eth_account import Account
from web3 import Web3

ROOT_DIR = Path(__file__).resolve().parents[1]
CONTRACTS_DIR = ROOT_DIR.parent / "contracts"
ESCROW_ARTIFACT_PATH = CONTRACTS_DIR / "artifacts" / "src" / "JobEscrow.sol" / "JobEscrow.json"
TOKEN_ARTIFACT_PATH = CONTRACTS_DIR / "artifacts" / "src" / "Token.sol" / "Token.json"

load_dotenv(ROOT_DIR / ".env")

RPC_URL = os.getenv("RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
WORKER_PRIVATE_KEY = os.getenv("WORKER_PRIVATE_KEY")
ESCROW_ADDRESS = os.getenv("ESCROW_ADDRESS")
FUND_AMOUNT = int(os.getenv("WORKER_FUND_AMOUNT", "500"))


def _require_env(name: str, value: str | None) -> str:
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _load_abi(path: Path) -> list[dict]:
    with path.open() as artifact_file:
        return json.load(artifact_file)["abi"]


def main() -> None:
    escrow_abi = _load_abi(ESCROW_ARTIFACT_PATH)
    token_abi = _load_abi(TOKEN_ARTIFACT_PATH)

    w3 = Web3(Web3.HTTPProvider(_require_env("RPC_URL", RPC_URL)))
    requester = Account.from_key(_require_env("PRIVATE_KEY", PRIVATE_KEY))
    worker = Account.from_key(_require_env("WORKER_PRIVATE_KEY", WORKER_PRIVATE_KEY))

    escrow = w3.eth.contract(
        address=Web3.to_checksum_address(_require_env("ESCROW_ADDRESS", ESCROW_ADDRESS)),
        abi=escrow_abi,
    )
    token = w3.eth.contract(
        address=Web3.to_checksum_address(escrow.functions.token().call()),
        abi=token_abi,
    )

    nonce = w3.eth.get_transaction_count(requester.address)
    tx = token.functions.transfer(
        worker.address,
        FUND_AMOUNT,
    ).build_transaction(
        {
            "from": requester.address,
            "nonce": nonce,
            "gas": 100000,
            "gasPrice": w3.to_wei("1", "gwei"),
        }
    )

    signed = w3.eth.account.sign_transaction(tx, _require_env("PRIVATE_KEY", PRIVATE_KEY))
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    print(
        {
            "worker_address": worker.address,
            "fund_amount": FUND_AMOUNT,
            "tx_hash": tx_hash.hex(),
            "receipt_status": receipt["status"],
            "worker_balance": token.functions.balanceOf(worker.address).call(),
        }
    )


if __name__ == "__main__":
    main()
