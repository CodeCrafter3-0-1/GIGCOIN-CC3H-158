import { useEffect, useState } from "react";
import {
  fetchJob,
  formatJobState,
  getContract,
  shortenAddress,
  toReadableContractError,
  type JobDetails,
} from "../web3/contract";

type JobListProps = {
  refreshKey: number;
};

export default function JobList({ refreshKey }: JobListProps) {
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
              </div>
              <span className="status-pill">{job.tokenAmount} GIG locked</span>
            </div>

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
                <dd>{job.stakeAmount}</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{job.deadline}</dd>
              </div>
              <div>
                <dt>Result CID</dt>
                <dd>{job.resultCID || "Pending submission"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
