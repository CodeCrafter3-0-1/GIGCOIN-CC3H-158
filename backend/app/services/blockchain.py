import binascii
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from eth_account import Account
from web3 import Web3
from web3.exceptions import MismatchedABI

from app.services.pricing import usd_to_token

load_dotenv()

RPC_URL = os.getenv("RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
ESCROW_ADDRESS = os.getenv("ESCROW_ADDRESS")

PROJECT_ROOT = Path(__file__).resolve().parents[3]
CONTRACTS_DIR = PROJECT_ROOT / "contracts"
ESCROW_ARTIFACT_PATH = CONTRACTS_DIR / "artifacts/src/JobEscrow.sol/JobEscrow.json"
TOKEN_ARTIFACT_PATH = CONTRACTS_DIR / "artifacts/src/Token.sol/Token.json"


def _require_env(name: str, value: str | None) -> str:
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


with ESCROW_ARTIFACT_PATH.open() as artifact_file:
    escrow_abi = json.load(artifact_file)["abi"]

with TOKEN_ARTIFACT_PATH.open() as artifact_file:
    token_abi = json.load(artifact_file)["abi"]


def _get_web3() -> Web3:
    return Web3(Web3.HTTPProvider(_require_env("RPC_URL", RPC_URL)))


def _get_account():
    private_key = _require_env("PRIVATE_KEY", PRIVATE_KEY)
    try:
        return Account.from_key(private_key)
    except (ValueError, binascii.Error) as exc:
        raise ValueError(
            "Invalid PRIVATE_KEY in backend/.env. Use a real Hardhat account private key "
            "like 0xabc123..., not a placeholder."
        ) from exc


def _get_contract(w3: Web3):
    return w3.eth.contract(
        address=Web3.to_checksum_address(_require_env("ESCROW_ADDRESS", ESCROW_ADDRESS)),
        abi=escrow_abi,
    )


def _validate_contract_call(w3: Web3, contract_address: str) -> None:
    code = w3.eth.get_code(contract_address)
    if not code or code == b"" or code.hex() == "0x":
        raise ValueError(
            "ESCROW_ADDRESS does not contain deployed contract code on the configured RPC network."
        )


def _get_token_contract(w3: Web3, escrow_contract):
    token_address = escrow_contract.functions.token().call()
    return w3.eth.contract(
        address=Web3.to_checksum_address(token_address),
        abi=token_abi,
    )


def _build_tx(w3: Web3, account_address: str, nonce: int) -> dict[str, str | int]:
    return {
        "from": account_address,
        "nonce": nonce,
        "gas": 300000,
        "gasPrice": w3.to_wei("1", "gwei"),
    }


def _sign_and_send(w3: Web3, tx: dict[str, str | int]) -> tuple[str, dict]:
    signed_tx = w3.eth.account.sign_transaction(tx, _require_env("PRIVATE_KEY", PRIVATE_KEY))
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return tx_hash.hex(), receipt


def create_job() -> dict[str, str | int]:
    w3 = _get_web3()
    account = _get_account()
    escrow_contract = _get_contract(w3)
    _validate_contract_call(w3, escrow_contract.address)
    token_contract = _get_token_contract(w3, escrow_contract)
    nonce = w3.eth.get_transaction_count(account.address)
    usd_price = 100

    tx = escrow_contract.functions.createJob(
        usd_price,
        account.address,
        999999999,
    ).build_transaction(_build_tx(w3, account.address, nonce))

    create_tx_hash, receipt = _sign_and_send(w3, tx)

    try:
        created_logs = escrow_contract.events.JobCreated().process_receipt(receipt)
    except MismatchedABI as exc:
        raise ValueError(
            "Create job transaction succeeded, but its receipt did not match the configured JobEscrow ABI."
        ) from exc

    if not created_logs:
        raise ValueError(
            "Create job transaction succeeded, but no JobCreated event was found. Check ESCROW_ADDRESS and contract deployment."
        )

    job_id = created_logs[0]["args"]["jobId"]

    token_amount = usd_to_token(usd_price)

    approve_tx = token_contract.functions.approve(
        escrow_contract.address,
        token_amount,
    ).build_transaction(_build_tx(w3, account.address, nonce + 1))
    approve_tx_hash, _ = _sign_and_send(w3, approve_tx)

    fund_tx = escrow_contract.functions.fundJob(
        job_id,
        token_amount,
    ).build_transaction(_build_tx(w3, account.address, nonce + 2))
    fund_tx_hash, _ = _sign_and_send(w3, fund_tx)

    return {
        "tx_hash": create_tx_hash,
        "approve_tx_hash": approve_tx_hash,
        "fund_tx_hash": fund_tx_hash,
        "job_id": job_id,
        "token_amount": token_amount,
    }


def get_job(job_id: int):
    w3 = _get_web3()
    contract = _get_contract(w3)
    _validate_contract_call(w3, contract.address)
    job = contract.functions.jobs(job_id).call()

    return {
        "requester": job[0],
        "worker": job[1],
        "usdPrice": job[2],
        "tokenAmount": job[3],
        "resultHash": job[4],
        "resultCID": job[5],
        "requesterPubKey": job[6],
        "stakeAmount": job[7],
        "state": job[8],
    }
