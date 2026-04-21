import { useEffect, useState } from "react";
import {
  acceptJob,
  approveEscrowSpending,
  fetchGigBalance,
  fetchValidatorStake,
  finalizeJob,
  finalizeValidation,
  voteOnJob,
  stakeAsValidator,
  toReadableContractError,
} from "../web3/contract";

type WorkerActionsProps = {
  account: string;
  onUpdated: () => void | Promise<void>;
};

export default function WorkerActions({ account, onUpdated }: WorkerActionsProps) {
  const [jobId, setJobId] = useState("1");
  const [stakeAmount, setStakeAmount] = useState("50");
  const [validatorStakeAmount, setValidatorStakeAmount] = useState("25");
  const [voteJobId, setVoteJobId] = useState("1");
  const [voteDecision, setVoteDecision] = useState<"valid" | "invalid">("valid");
  const [finalizeJobId, setFinalizeJobId] = useState("1");
  const [settleJobId, setSettleJobId] = useState("1");
  const [gigBalance, setGigBalance] = useState("0");
  const [validatorStakeBalance, setValidatorStakeBalance] = useState("0");
  const [loadingKey, setLoadingKey] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const refreshBalances = async () => {
    if (!account) {
      setGigBalance("0");
      setValidatorStakeBalance("0");
      return;
    }

    try {
      const [nextGigBalance, nextValidatorStake] = await Promise.all([
        fetchGigBalance(account),
        fetchValidatorStake(account),
      ]);
      setGigBalance(nextGigBalance);
      setValidatorStakeBalance(nextValidatorStake);
    } catch (nextError) {
      setError(toReadableContractError(nextError).message);
    }
  };

  useEffect(() => {
    void refreshBalances();
  }, [account]);

  const runAction = async (key: string, action: () => Promise<string>, successLabel: string) => {
    setLoadingKey(key);
    setError("");
    setStatus("");

    try {
      const txHash = await action();
      setStatus(`${successLabel} Tx: ${txHash}`);
      await refreshBalances();
      await onUpdated();
    } catch (nextError) {
      setError(toReadableContractError(nextError).message);
    } finally {
      setLoadingKey("");
    }
  };

  const parsedStakeAmount = BigInt(stakeAmount || "0");
  const parsedValidatorStakeAmount = BigInt(validatorStakeAmount || "0");

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Worker Ops</p>
          <h2>On-chain worker actions</h2>
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">GigCoin balance</p>
          <strong className="metric-value">{gigBalance} GIG</strong>
        </article>
        <article className="metric-card">
          <p className="metric-label">Validator stake</p>
          <strong className="metric-value">{validatorStakeBalance} GIG</strong>
        </article>
        <article className="metric-card">
          <p className="metric-label">Connected mode</p>
          <strong className="metric-value">Worker</strong>
        </article>
      </div>

      <div className="operation-grid">
        <article className="action-card">
          <h3>Accept job</h3>
          <p className="supporting-text compact">Approve stake first, then lock it to claim a funded job.</p>
          <div className="form-grid compact-form">
            <label>
              <span>Job ID</span>
              <input value={jobId} onChange={(event) => setJobId(event.target.value)} inputMode="numeric" />
            </label>
            <label>
              <span>Stake amount</span>
              <input
                value={stakeAmount}
                onChange={(event) => setStakeAmount(event.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>
          <div className="actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!account || loadingKey === "approve-accept"}
              onClick={() =>
                void runAction(
                  "approve-accept",
                  () => approveEscrowSpending(parsedStakeAmount),
                  "Stake approval sent.",
                )
              }
            >
              {loadingKey === "approve-accept" ? "Approving..." : "Approve stake"}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={!account || loadingKey === "accept"}
              onClick={() =>
                void runAction("accept", () => acceptJob(Number(jobId || "0"), parsedStakeAmount), "Job accepted.")
              }
            >
              {loadingKey === "accept" ? "Accepting..." : "Accept job"}
            </button>
          </div>
        </article>

        <article className="action-card">
          <h3>Become validator</h3>
          <p className="supporting-text compact">Lock GIG as validator stake so you can vote on submitted work.</p>
          <div className="form-grid compact-form">
            <label>
              <span>Stake amount</span>
              <input
                value={validatorStakeAmount}
                onChange={(event) => setValidatorStakeAmount(event.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>
          <div className="actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!account || loadingKey === "approve-validator"}
              onClick={() =>
                void runAction(
                  "approve-validator",
                  () => approveEscrowSpending(parsedValidatorStakeAmount),
                  "Validator approval sent.",
                )
              }
            >
              {loadingKey === "approve-validator" ? "Approving..." : "Approve validator stake"}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={!account || loadingKey === "stake-validator"}
              onClick={() =>
                void runAction(
                  "stake-validator",
                  () => stakeAsValidator(parsedValidatorStakeAmount),
                  "Validator stake locked.",
                )
              }
            >
              {loadingKey === "stake-validator" ? "Staking..." : "Stake as validator"}
            </button>
          </div>
        </article>

        <article className="action-card">
          <h3>Vote and validate</h3>
          <p className="supporting-text compact">Vote on validating work, then finalize the validation outcome.</p>
          <div className="form-grid compact-form">
            <label>
              <span>Job ID</span>
              <input value={voteJobId} onChange={(event) => setVoteJobId(event.target.value)} inputMode="numeric" />
            </label>
            <label>
              <span>Decision</span>
              <select
                className="select-input"
                value={voteDecision}
                onChange={(event) => setVoteDecision(event.target.value as "valid" | "invalid")}
              >
                <option value="valid">Valid</option>
                <option value="invalid">Invalid</option>
              </select>
            </label>
            <label>
              <span>Finalize validation job ID</span>
              <input
                value={finalizeJobId}
                onChange={(event) => setFinalizeJobId(event.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>
          <div className="actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!account || loadingKey === "vote"}
              onClick={() =>
                void runAction(
                  "vote",
                  () => voteOnJob(Number(voteJobId || "0"), voteDecision === "valid"),
                  "Vote submitted.",
                )
              }
            >
              {loadingKey === "vote" ? "Voting..." : "Submit vote"}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={!account || loadingKey === "finalize-validation"}
              onClick={() =>
                void runAction(
                  "finalize-validation",
                  () => finalizeValidation(Number(finalizeJobId || "0")),
                  "Validation finalized.",
                )
              }
            >
              {loadingKey === "finalize-validation" ? "Finalizing..." : "Finalize validation"}
            </button>
          </div>
        </article>

        <article className="action-card">
          <h3>Settle verified job</h3>
          <p className="supporting-text compact">
            Release the escrow payout and mint the GigCoin worker reward after verification succeeds.
          </p>
          <div className="form-grid compact-form">
            <label>
              <span>Job ID</span>
              <input
                value={settleJobId}
                onChange={(event) => setSettleJobId(event.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>
          <div className="actions">
            <button
              className="primary-button"
              type="button"
              disabled={!account || loadingKey === "finalize-job"}
              onClick={() =>
                void runAction(
                  "finalize-job",
                  () => finalizeJob(Number(settleJobId || "0")),
                  "Job settled and rewards minted.",
                )
              }
            >
              {loadingKey === "finalize-job" ? "Settling..." : "Finalize payout"}
            </button>
          </div>
        </article>
      </div>

      {!account ? <p className="message warning">Connect the worker wallet before using on-chain actions.</p> : null}
      {status ? <p className="message success">{status}</p> : null}
      {error ? <p className="message error">{error}</p> : null}
    </section>
  );
}
