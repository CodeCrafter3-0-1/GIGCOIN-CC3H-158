import { useEffect, useState } from "react";
import {
  fetchJob,
  formatJobState,
  getJobMetadata,
  getContract,
  shortenAddress,
  toReadableContractError,
  type JobDetails,
} from "../web3/contract";

type JobListProps = {
  refreshKey: number;
  mode?: "default" | "worker";
  onSelectJob?: (job: JobDetails) => void;
  selectedJobId?: number | null;
  currentAccount?: string;
};

export default function JobList({
  refreshKey,
  mode = "default",
  onSelectJob,
  selectedJobId = null,
  currentAccount = "",
}: JobListProps) {
  const [jobs, setJobs] = useState<JobDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadJobs = async () => {
    setLoading(true);
    setError("");

    try {
      const contract = await getContract(true);
      const countRaw = await contract.jobCounter();
      const count = Number(countRaw);

      const loadedJobs = await Promise.all(
        Array.from({ length: count }, (_, index) => fetchJob(index + 1)),
      );

      setJobs(loadedJobs.reverse());
    } catch (err) {
      const message = toReadableContractError(err).message;
      setJobs([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, [refreshKey]);

  const getWorkerActionLabel = (job: JobDetails) => {
    if (job.state === 1 && (!job.worker || job.worker === "0x0000000000000000000000000000000000000000")) {
      return "Accept gig";
    }

    if (job.state === 2 && currentAccount && job.worker.toLowerCase() === currentAccount.toLowerCase()) {
      return "Submit work";
    }

    if (job.state === 5 && currentAccount && job.worker.toLowerCase() === currentAccount.toLowerCase()) {
      return "Claim reward";
    }

    if (job.state === 4) {
      return "Vote / validate";
    }

    return "Open worker actions";
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Job Feed</p>
          <h2>Live escrow jobs</h2>
        </div>
        <button className="secondary-button" onClick={() => void loadJobs()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <p className="message error">{error}</p> : null}

      {!loading && jobs.length === 0 ? (
        <p className="supporting-text">No jobs on-chain yet. Create one to seed the demo.</p>
      ) : null}

      <div className="job-list">
        {jobs.map((job) => (
          <article className="job-card" key={job.id}>
            <div className="job-card-header">
              <div>
                <p className="job-index">Job #{job.id}</p>
                <h3>{formatJobState(job.state)}</h3>
                {getJobMetadata(job.id)?.title ? <p className="job-brief-title">{getJobMetadata(job.id)?.title}</p> : null}
              </div>
              <span className="status-pill">{job.tokenAmountFormatted} GIG locked</span>
            </div>

            {getJobMetadata(job.id)?.description ? (
              <p className="supporting-text compact">{getJobMetadata(job.id)?.description}</p>
            ) : null}

            <dl className="job-meta">
              <div>
                <dt>Requester</dt>
                <dd>{shortenAddress(job.requester)}</dd>
              </div>
              <div>
                <dt>Worker</dt>
                <dd>{shortenAddress(job.worker)}</dd>
              </div>
              <div>
                <dt>USD price</dt>
                <dd>${job.usdPrice}</dd>
              </div>
              <div>
                <dt>Stake</dt>
                <dd>{job.stakeAmountFormatted} GIG</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{getJobMetadata(job.id)?.deadlineLabel || job.deadline}</dd>
              </div>
              <div>
                <dt>Result CID</dt>
                <dd>{job.resultCID || "Pending submission"}</dd>
              </div>
            </dl>

            {mode === "worker" ? (
              <div className="job-card-actions">
                <button
                  className={`primary-button ${selectedJobId === job.id ? "selected-action" : ""}`}
                  type="button"
                  onClick={() => onSelectJob?.(job)}
                >
                  {selectedJobId === job.id ? "Selected job" : getWorkerActionLabel(job)}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
