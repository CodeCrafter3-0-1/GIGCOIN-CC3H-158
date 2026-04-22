import { useEffect, useState } from "react";
import {
  acceptJob,
  approveEscrowSpending,
  fetchGigBalance,
  formatJobState,
  claimMockReward,
  toReadableContractError,
  type JobDetails,
} from "../web3/contract";

type WorkerActionsProps = {
  account: string;
  onUpdated: () => void | Promise<void>;
  selectedJob: JobDetails | null;
  onClose: () => void;
  onRewardClaimed?: (message: string) => void;
};

type Step = "accept" | "submit" | "reward";

export default function WorkerActions({
  account,
  onUpdated,
  selectedJob,
  onClose,
  onRewardClaimed,
}: WorkerActionsProps) {
  const [step, setStep] = useState<Step>("accept");
  const [gigTitle, setGigTitle] = useState("");
  const [gigDescription, setGigDescription] = useState("");
  const [loadingKey, setLoadingKey] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const refreshBalances = async () => {
    if (!account) return;
    try {
      await fetchGigBalance(account);
    } catch (nextError) {
      setError(toReadableContractError(nextError).message);
    }
  };

  useEffect(() => {
    void refreshBalances();
  }, [account]);

  useEffect(() => {
    if (selectedJob) {
      setStep("accept");
      setStatus("");
      setError("");
    }
  }, [selectedJob]);

  const runAction = async (key: string, action: () => Promise<string>, successLabel: string) => {
    setLoadingKey(key);
    setError("");
    setStatus("");

    try {
      const txHash = await action();
      setStatus(`${successLabel} Tx: ${txHash}`);
      await refreshBalances();
      await onUpdated();
      return true;
    } catch (nextError) {
      setError(toReadableContractError(nextError).message);
      return false;
    } finally {
      setLoadingKey("");
    }
  };

  if (!selectedJob) return null;

  const stakeAmount = (selectedJob.stakeAmount && selectedJob.stakeAmount !== "0") ? BigInt(selectedJob.stakeAmount) : BigInt("50000000000000000000");

  const handleAccept = async () => {
    const approved = await runAction("approve", () => approveEscrowSpending(stakeAmount), "Stake approved.");
    if (!approved) return;
    const accepted = await runAction("accept", () => acceptJob(selectedJob.id, stakeAmount), "Job accepted.");
    if (accepted) setStep("submit");
  };

  const handleSubmit = async () => {
    const amount = BigInt("50000000000000000000"); // 50 GIG
    const rewarded = await runAction("reward", () => claimMockReward(amount), "Reward claimed.");
    if (rewarded) {
      setStep("reward");
      onRewardClaimed?.("coinbase transaction of 50 gigs");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="panel worker-modal" onClick={(event) => event.stopPropagation()}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Worker Workspace</p>
            <h2>Job #{selectedJob.id}</h2>
            <p className="supporting-text compact">{formatJobState(selectedJob.state)} · {selectedJob.tokenAmountFormatted} GIG</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="operation-grid">
          <div style={{ width: "100%", maxWidth: "500px", margin: "0 auto" }}>
          {step === "accept" && (
            <article className="action-card">
              <h3>Accept this job</h3>
              <p className="supporting-text compact">Stake GIG tokens to lock this job and start working.</p>
              <div className="actions" style={{ marginTop: "1rem" }}>
                <button className="primary-button" type="button" disabled={!account || loadingKey !== ""} onClick={handleAccept} style={{ width: "100%" }}>
                  {loadingKey === "approve" ? "Approving stake..." : loadingKey === "accept" ? "Accepting job..." : "Accept gig"}
                </button>
              </div>
            </article>
          )}

          {step === "submit" && (
            <article className="action-card">
              <h3>Gig accepted and locked</h3>
              <div className="form-grid stack" style={{ marginTop: "1.5rem", gap: "1.2rem" }}>
                <label>
                  <span style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>Gig Title</span>
                  <input value={gigTitle} onChange={(e) => setGigTitle(e.target.value)} placeholder="What are you submitting?" />
                </label>
                <label>
                  <span style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>Gig Description</span>
                  <textarea 
                    value={gigDescription} 
                    onChange={(e) => setGigDescription(e.target.value)} 
                    placeholder="Briefly describe the outcome..." 
                    rows={4} 
                    style={{ width: "100%", padding: "13px 14px", borderRadius: "12px", border: "1px solid var(--border-strong)", resize: "none" }} 
                  />
                </label>
              </div>
              <div className="actions" style={{ marginTop: "1.5rem" }}>
                <button className="primary-button" type="button" onClick={handleSubmit} disabled={!gigTitle || !gigDescription || loadingKey !== ""} disabled={!gigTitle || !gigDescription} style={{ width: "100%" }}>{loadingKey === "reward" ? "Claiming reward..." : "Submit gig"}</button>
              </div>
            </article>
          )}

          {step === "reward" && (
            <article className="action-card">
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                <h3>Gig Submitted!</h3>
                <p className="supporting-text compact">Your work has been sent for review.</p>
              </div>
              <div className="message success" style={{ marginTop: "1rem", textAlign: "center", padding: "1rem" }}>
                <p style={{ margin: 0, opacity: 0.8 }}>Notification</p>
                <strong style={{ fontSize: "1.2rem" }}>coinbase transaction of 50 gigs</strong>
              </div>
              <div className="actions" style={{ marginTop: "1.5rem" }}>
                <button className="primary-button" type="button" onClick={onClose} style={{ width: "100%" }}>Done</button>
              </div>
            </article>
          )}
          </div>
        </div>

        {!account && <p className="message warning" style={{ marginTop: "1rem" }}>Connect your wallet to perform actions on this job.</p>}
        {status && step === "accept" && <p className="message success" style={{ marginTop: "1rem" }}>{status}</p>}
        {error && <p className="message error" style={{ marginTop: "1rem" }}>{error}</p>}
      </section>
    </div>
  );
}
