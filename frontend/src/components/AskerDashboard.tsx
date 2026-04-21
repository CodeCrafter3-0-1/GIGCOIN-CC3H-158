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
    <section className="workspace-grid">
      <div className="stack">
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

      <JobList refreshKey={refreshKey} />
    </section>
  );
}
