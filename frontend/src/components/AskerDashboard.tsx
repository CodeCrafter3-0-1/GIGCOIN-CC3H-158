import CreateJob from "./CreateJob";
import JobList from "./JobList";
import Wallet from "./Wallet";

type AskerDashboardProps = {
  account: string;
  connect: () => Promise<void>;
  connecting: boolean;
  switchingNetwork: boolean;
  switchToLocalNetwork: () => Promise<void>;
  error: string;
  hasWallet: boolean;
  refreshKey: number;
  onCreated: () => void | Promise<void>;
  networkLabel: string;
  needsLocalNetwork: boolean;
};

export default function AskerDashboard({
  account,
  connect,
  connecting,
  switchingNetwork,
  switchToLocalNetwork,
  error,
  hasWallet,
  refreshKey,
  onCreated,
  networkLabel,
  needsLocalNetwork,
}: AskerDashboardProps) {
  return (
    <section className="dashboard-shell">
      <section className="panel dashboard-intro">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Asker Workspace</p>
            <h2>Post jobs and manage escrow requests</h2>
          </div>
        </div>
        <p className="supporting-text">
          Use the requester wallet to open new compute jobs, set pricing, and monitor every escrowed
          request from one aligned workspace.
        </p>
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
            title="Requester wallet"
            description="Authenticate the account that will open and fund escrow jobs."
            networkLabel={networkLabel}
            needsLocalNetwork={needsLocalNetwork}
          />
          <CreateJob account={account} onCreated={onCreated} />
        </div>

        <div className="dashboard-main">
          <JobList refreshKey={refreshKey} />
        </div>
      </section>
    </section>
  );
}
