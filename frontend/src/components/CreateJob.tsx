import { useEffect, useState } from "react";
import { getContract } from "../web3/contract";

type CreateJobProps = {
  account: string;
  onCreated: () => Promise<void> | void;
};

const DEFAULT_DEADLINE_OFFSET_SECONDS = 60 * 60 * 24;

export default function CreateJob({ account, onCreated }: CreateJobProps) {
  const [usdPrice, setUsdPrice] = useState("100");
  const [requesterPubKey, setRequesterPubKey] = useState(account);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requesterPubKey && account) {
      setRequesterPubKey(account);
    }
  }, [account, requesterPubKey]);

  const resolvedDeadline = deadline
    ? Math.floor(new Date(deadline).getTime() / 1000)
    : Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_OFFSET_SECONDS;

  const createJob = async () => {
    setLoading(true);
    setError("");
    setStatus("");

    try {
      const contract = await getContract();
      const tx = await contract.createJob(
        BigInt(usdPrice || "0"),
        requesterPubKey || account,
        BigInt(resolvedDeadline),
      );

      setStatus(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      setStatus("Job created successfully.");
      await onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create job.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Create Job</p>
          <h2>Open a new escrow request</h2>
        </div>
      </div>

      <div className="form-grid">
        <label>
          <span>USD price</span>
          <input
            value={usdPrice}
            onChange={(event) => setUsdPrice(event.target.value)}
            inputMode="numeric"
            placeholder="100"
          />
        </label>

        <label>
          <span>Requester pub key address</span>
          <input
            value={requesterPubKey}
            onChange={(event) => setRequesterPubKey(event.target.value)}
            placeholder="0x..."
          />
        </label>

        <label>
          <span>Deadline</span>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>
      </div>

      <div className="actions">
        <button className="primary-button" onClick={() => void createJob()} disabled={loading || !account}>
          {loading ? "Creating..." : "Create Job"}
        </button>
        <span className="inline-note">
          This writes directly to `JobEscrow.createJob(...)` with your connected wallet.
        </span>
      </div>

      {!account ? <p className="message warning">Connect your wallet before creating a job.</p> : null}
      {status ? <p className="message success">{status}</p> : null}
      {error ? <p className="message error">{error}</p> : null}
    </section>
  );
}
