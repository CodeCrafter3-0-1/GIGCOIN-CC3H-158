import { shortenAddress } from "../web3/contract";

type WalletProps = {
  account: string;
  connect: () => Promise<void>;
  connecting: boolean;
  switchingNetwork?: boolean;
  switchToLocalNetwork?: () => Promise<void>;
  error: string;
  hasWallet: boolean;
  title?: string;
  description?: string;
  networkLabel?: string;
  needsLocalNetwork?: boolean;
};

export default function Wallet({
  account,
  connect,
  connecting,
  switchingNetwork = false,
  switchToLocalNetwork,
  error,
  hasWallet,
  title = "Connect wallet",
  description = "Connect MetaMask to create jobs and inspect the live escrow state.",
  networkLabel = "Unknown network",
  needsLocalNetwork = false,
}: WalletProps) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Wallet</p>
          <h2>{title}</h2>
        </div>
        {account ? <span className="status-pill online">Connected</span> : null}
      </div>

      {account ? (
        <p className="supporting-text">
          Active account: <strong>{shortenAddress(account)}</strong>
        </p>
      ) : (
        <p className="supporting-text">{description}</p>
      )}

      <div className="auth-details compact-grid">
        <div className="auth-detail">
          <span className="detail-label">Network</span>
          <strong>{networkLabel}</strong>
        </div>
        <div className="auth-detail">
          <span className="detail-label">Wallet status</span>
          <strong>{account ? "Authenticated" : "Pending"}</strong>
        </div>
      </div>

      <div className="actions">
        <button className="primary-button" onClick={() => void connect()} disabled={connecting || !hasWallet}>
          {connecting ? "Connecting..." : account ? "Reconnect Wallet" : "Connect Wallet"}
        </button>
        <button
          className="secondary-button"
          onClick={() => void switchToLocalNetwork?.()}
          disabled={!hasWallet || !switchToLocalNetwork || switchingNetwork}
        >
          {switchingNetwork ? "Switching..." : "Switch to Hardhat"}
        </button>
        {!hasWallet ? <span className="inline-note">MetaMask or another EVM wallet is required.</span> : null}
      </div>

      {needsLocalNetwork ? (
        <p className="message warning">Wrong wallet network. Switch to Hardhat Local `31337`.</p>
      ) : null}
      {error ? <p className="message error">{error}</p> : null}
    </section>
  );
}
