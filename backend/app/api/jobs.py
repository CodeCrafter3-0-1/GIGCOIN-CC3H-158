from fastapi import APIRouter, HTTPException

from app.services.blockchain import create_job, get_job
from app.services.decryption import decrypt_payload
from app.services.ipfs import fetch_json

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/create")
def create() -> dict[str, str | int]:
    try:
        return create_job()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{job_id}/result")
def get_result(job_id: int):
    try:
        job = get_job(job_id)

        if not job["resultCID"]:
            return {"error": "No result yet"}

        payload = fetch_json(job["resultCID"])

        result = decrypt_payload(payload)

        return {
            "job_id": job_id,
            "result": result,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
