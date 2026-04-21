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
  return (
    <section className="workspace-grid worker-grid">
      <div className="stack">
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
        />

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Rewards</p>
              <h2>GigCoin reward schedule</h2>
            </div>
          </div>

          <div className="metric-grid">
            {rewardItems.map((item) => (
              <article className="metric-card" key={item.label}>
                <p className="metric-label">{item.label}</p>
                <strong className="metric-value">{item.value}</strong>
                <p className="supporting-text compact">{item.note}</p>
              </article>
            ))}
          </div>
        </section>

        <WorkerActions account={account} onUpdated={onUpdated} />

        <ResultViewer />
      </div>

      <JobList refreshKey={refreshKey} />
    </section>
  );
}
