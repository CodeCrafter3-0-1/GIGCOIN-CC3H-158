try:
    from executor.runner import run_task
except ModuleNotFoundError:
    from worker.executor.runner import run_task


def execute(job: dict[str, int]) -> str:
    job_id = job["id"]
    return run_task(f"job-{job_id}")
