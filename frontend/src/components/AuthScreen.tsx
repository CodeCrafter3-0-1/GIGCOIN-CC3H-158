import { shortenAddress } from "../web3/contract";

type UserRole = "asker" | "worker";

type AuthScreenProps = {
  account: string;
  connect: () => Promise<void>;
  connecting: boolean;
  switchingNetwork: boolean;
  switchToLocalNetwork: () => Promise<void>;
  error: string;
  hasWallet: boolean;
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onContinue: () => void;
  networkLabel: string;
  needsLocalNetwork: boolean;
};

export default function AuthScreen({
  account,
  connect,
  connecting,
  switchingNetwork,
  switchToLocalNetwork,
  error,
  hasWallet,
  selectedRole,
  onRoleChange,
  onContinue,
  networkLabel,
  needsLocalNetwork,
}: AuthScreenProps) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">GigCoin</p>
          <h1>Authenticate and choose your workspace.</h1>
          <p className="supporting-text">
            Use wallet-based access for the demo, then enter the asker or worker console.
          </p>
        </div>

        <div className="role-grid">
          <button
            className={`role-card ${selectedRole === "asker" ? "active" : ""}`}
            onClick={() => onRoleChange("asker")}
            type="button"
          >
            <span className="role-title">Asker</span>
            <span className="role-copy">Create escrow jobs, fund requests, and inspect delivery.</span>
          </button>

          <button
            className={`role-card ${selectedRole === "worker" ? "active" : ""}`}
            onClick={() => onRoleChange("worker")}
            type="button"
          >
            <span className="role-title">Worker</span>
            <span className="role-copy">Track open jobs, review outputs, and monitor GigCoin rewards.</span>
          </button>
        </div>

        <section className="panel auth-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Authentication</p>
              <h2>Wallet session</h2>
            </div>
            {account ? <span className="status-pill online">Authenticated</span> : null}
          </div>

          <div className="auth-details">
            <div className="auth-detail">
              <span className="detail-label">Role</span>
              <strong>{selectedRole === "asker" ? "Asker" : "Worker"}</strong>
            </div>
            <div className="auth-detail">
              <span className="detail-label">Network</span>
              <strong>{networkLabel}</strong>
            </div>
            <div className="auth-detail">
              <span className="detail-label">Wallet</span>
              <strong>{account ? shortenAddress(account) : "Not connected"}</strong>
            </div>
          </div>

          <div className="actions">
            <button className="primary-button" onClick={() => void connect()} disabled={connecting || !hasWallet}>
              {connecting ? "Connecting..." : account ? "Reconnect Wallet" : "Connect Wallet"}
            </button>
            <button
              className="secondary-button"
              onClick={() => void switchToLocalNetwork()}
              disabled={!hasWallet || switchingNetwork}
            >
              {switchingNetwork ? "Switching..." : "Switch to Hardhat 31337"}
            </button>
            <button className="secondary-button" onClick={onContinue} disabled={!account}>
              Continue
            </button>
          </div>

          {!hasWallet ? <p className="message warning">Install MetaMask or another EVM wallet to continue.</p> : null}
          {!account ? <p className="message warning">Connect a wallet before opening a workspace.</p> : null}
          {needsLocalNetwork ? (
            <p className="message warning">
              Switch MetaMask to the local Hardhat network at `http://127.0.0.1:8545` with chain id `31337`.
            </p>
          ) : null}
          {error ? <p className="message error">{error}</p> : null}
        </section>
      </section>
    </main>
  );
}
