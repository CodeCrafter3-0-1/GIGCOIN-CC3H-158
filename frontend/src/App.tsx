import { useState } from "react";
import AskerDashboard from "./components/AskerDashboard";
import AuthScreen from "./components/AuthScreen";
import MarketTab from "./components/MarketTab";
import WorkerDashboard from "./components/WorkerDashboard";
import { useWallet } from "./hooks/useWallet";

type AppTab = "asker" | "worker" | "market";
type UserRole = "asker" | "worker";

function formatNetworkLabel(chainId: string) {
  if (!chainId) {
    return "No network detected";
  }

  if (chainId === "0x7a69" || chainId === "0x539") {
    return "Hardhat Local (31337)";
  }

  return `Chain ${parseInt(chainId, 16)}`;
}

function isLocalHardhatChain(chainId: string) {
  return chainId === "0x7a69" || chainId === "0x539";
}

function App() {
  const {
    account,
    connect,
    connecting,
    switchingNetwork,
    switchToLocalNetwork,
    error,
    hasWallet,
    chainId,
  } = useWallet();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("asker");
  const [activeTab, setActiveTab] = useState<AppTab>("asker");

  const networkLabel = formatNetworkLabel(chainId);
  const needsLocalNetwork = Boolean(account) && !isLocalHardhatChain(chainId);

  if (!isAuthenticated) {
    return (
      <AuthScreen
        account={account}
        connect={connect}
        connecting={connecting}
        switchingNetwork={switchingNetwork}
        switchToLocalNetwork={switchToLocalNetwork}
        error={error}
        hasWallet={hasWallet}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        onContinue={() => {
          setActiveTab(selectedRole);
          setIsAuthenticated(true);
        }}
        networkLabel={networkLabel}
        needsLocalNetwork={needsLocalNetwork}
      />
    );
  }

  return (
    <main className="app-shell">
      <section className="page-header">
        <div>
          <p className="eyebrow">GigCoin Workspace</p>
          <h1>Escrow operations and token market tools.</h1>
          <p className="supporting-text page-copy">
            Separate workspaces for askers, workers, and GigCoin market activity. The current
            session is authenticated through your connected wallet.
          </p>
        </div>

        <div className="page-actions">
          <span className="status-pill">{networkLabel}</span>
          <button className="secondary-button" type="button" onClick={() => setIsAuthenticated(false)}>
            Switch Role
          </button>
        </div>
      </section>

      <nav className="tab-row" aria-label="Workspace tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === "asker" ? "active" : ""}`}
          onClick={() => setActiveTab("asker")}
        >
          Asker
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === "worker" ? "active" : ""}`}
          onClick={() => setActiveTab("worker")}
        >
          Worker
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === "market" ? "active" : ""}`}
          onClick={() => setActiveTab("market")}
        >
          Market
        </button>
      </nav>

      {activeTab === "asker" ? (
        <AskerDashboard
          account={account}
          connect={connect}
          connecting={connecting}
          switchingNetwork={switchingNetwork}
          switchToLocalNetwork={switchToLocalNetwork}
          error={error}
          hasWallet={hasWallet}
          refreshKey={refreshKey}
          networkLabel={networkLabel}
          needsLocalNetwork={needsLocalNetwork}
          onCreated={() => {
            setRefreshKey((current) => current + 1);
          }}
        />
      ) : null}

      {activeTab === "worker" ? (
        <WorkerDashboard
          account={account}
          connect={connect}
          connecting={connecting}
          switchingNetwork={switchingNetwork}
          switchToLocalNetwork={switchToLocalNetwork}
          error={error}
          hasWallet={hasWallet}
          refreshKey={refreshKey}
          networkLabel={networkLabel}
          needsLocalNetwork={needsLocalNetwork}
          onUpdated={() => {
            setRefreshKey((current) => current + 1);
          }}
        />
      ) : null}

      {activeTab === "market" ? <MarketTab /> : null}
    </main>
  );
}

export default App;
