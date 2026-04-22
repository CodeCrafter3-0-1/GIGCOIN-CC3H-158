import { useEffect, useState } from "react";
import { fetchGigBalance, type JobDetails } from "../web3/contract";
import JobList from "./JobList";
import ResultViewer from "./ResultViewer";
import Wallet from "./Wallet";
import WorkerActions from "./WorkerActions";

type WorkerDashboardProps = {
  account: string;
  connect: () => Promise<void>;
  connecting: boolean;
  switchingNetwork: boolean;
  switchToLocalNetwork: () => Promise<void>;
  error: string;
  hasWallet: boolean;
  refreshKey: number;
  networkLabel: string;
  onUpdated: () => void | Promise<void>;
  needsLocalNetwork: boolean;
};

const rewardItems = [
  { label: "Job settlement bonus", value: "10 GIG", note: "Minted to the worker after successful finalization." },
  { label: "Validator reward", value: "2 GIG", note: "Minted per successful validator vote." },
  { label: "Escrow payout", value: "Job dependent", note: "Released from locked job funds when verification passes." },
];

export default function WorkerDashboard({
  account,
  connect,
  connecting,
  switchingNetwork,
  switchToLocalNetwork,
  error,
  hasWallet,
  refreshKey,
  networkLabel,
  onUpdated,
  needsLocalNetwork,
}: WorkerDashboardProps) {
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [gigBalance, setGigBalance] = useState("0");
  const [rewardNotice, setRewardNotice] = useState("");

  useEffect(() => {
    if (!account) {
      setGigBalance("0");
      return;
    }

    void (async () => {
      try {
        setGigBalance(await fetchGigBalance(account));
      } catch {
        setGigBalance("0");
      }
    })();
  }, [account, refreshKey]);

  return (
    <section className="dashboard-shell">
      <section className="panel dashboard-intro">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Worker Workspace</p>
            <h2>Operate jobs, validation, and payout flow</h2>
          </div>
        </div>
        <p className="supporting-text">
          Track open jobs, keep validator stake ready, and use the action console below to accept,
          vote on, and settle GigCoin-funded work.
        </p>
        {rewardNotice ? <p className="message success">{rewardNotice}</p> : null}
      </section>

      <section className="dashboard-columns">
        <div className="dashboard-sidebar stack">
          <Wallet
            account={account}
            connect={connect}
            connecting={connecting}
            switchingNetwork={switchingNetwork}
            switchToLocalNetwork={switchToLocalNetwork}
            error={error}
            hasWallet={hasWallet}
            title="Worker wallet"
            description="Use the worker account to accept jobs, stake, validate, and collect GigCoin rewards."
            networkLabel={networkLabel}
            needsLocalNetwork={needsLocalNetwork}
            balanceLabel="GIG balance"
            balanceValue={`${gigBalance} GIG`}
          />

          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Rewards</p>
                <h2>GigCoin reward schedule</h2>
              </div>
            </div>

            <div className="metric-grid stacked-metrics">
              {rewardItems.map((item) => (
                <article className="metric-card" key={item.label}>
                  <p className="metric-label">{item.label}</p>
                  <strong className="metric-value">{item.value}</strong>
                  <p className="supporting-text compact">{item.note}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="dashboard-main stack">
          <JobList
            refreshKey={refreshKey}
            mode="worker"
            onSelectJob={(job) => setSelectedJob(job)}
            selectedJobId={selectedJob?.id ?? null}
            currentAccount={account}
          />
          <ResultViewer />
        </div>
      </section>

      <WorkerActions
        account={account}
        selectedJob={selectedJob}
        onClose={() => setSelectedJob(null)}
        onUpdated={async () => {
          await onUpdated();
          if (account) {
            try {
              setGigBalance(await fetchGigBalance(account));
            } catch {
              // Keep the last known value.
            }
          }
        }}
        onRewardClaimed={(message) => {
          setRewardNotice(message);
        }}
      />
    </section>
  );
}
