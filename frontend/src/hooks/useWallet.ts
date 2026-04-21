import { useCallback, useEffect, useState } from "react";
import { getProvider } from "../web3/contract";

type WalletState = {
  account: string;
  connecting: boolean;
  switchingNetwork: boolean;
  error: string;
  hasWallet: boolean;
  chainId: string;
};

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    account: "",
    connecting: false,
    switchingNetwork: false,
    error: "",
    hasWallet: typeof window !== "undefined" && Boolean(window.ethereum),
    chainId: "",
  });

  const connect = useCallback(async () => { if (state.connecting) return;
    if (!window.ethereum) {
      setState((current) => ({
        ...current,
        error: "No injected wallet found in this browser.",
      }));
      return;
    }

    setState((current) => ({ ...current, connecting: true, error: "" }));

    try {
      const provider = await getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts[0] ?? "";

      setState({
        account,
        connecting: false,
        switchingNetwork: false,
        error: account ? "" : "Wallet connected without any available account.",
        hasWallet: true,
        chainId: await provider.send("eth_chainId", []),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect wallet.";
      setState((current) => ({
        ...current,
        connecting: false,
        error: message,
      }));
    }
  }, []);

  const switchToLocalNetwork = useCallback(async () => {
    if (!window.ethereum) {
      setState((current) => ({
        ...current,
        error: "No injected wallet found in this browser.",
      }));
      return;
    }

    setState((current) => ({
      ...current,
      switchingNetwork: true,
      error: "",
    }));

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x7a69" }],
      });
    } catch (error) {
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? Number((error as { code?: unknown }).code)
          : undefined;

      if (errorCode === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x7a69",
              chainName: "Hardhat Local",
              nativeCurrency: {
                name: "Ethereum",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["http://127.0.0.1:8545"],
            },
          ],
        });
      } else {
        throw error;
      }
    }

    try {
      const provider = await getProvider();
      const nextChainId = await provider.send("eth_chainId", []);
      setState((current) => ({
        ...current,
        switchingNetwork: false,
        chainId: nextChainId,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to confirm wallet network.";
      setState((current) => ({
        ...current,
        switchingNetwork: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    void (async () => {
      try {
        const provider = await getProvider();
        const accounts = await provider.send("eth_accounts", []);
        const nextChainId = await provider.send("eth_chainId", []);

        setState((current) => ({
          ...current,
          account: accounts[0] ?? "",
          hasWallet: true,
          chainId: nextChainId,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to read wallet session.";
        setState((current) => ({ ...current, error: message }));
      }
    })();

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = Array.isArray(accounts) ? accounts : [];
      setState((current) => ({
        ...current,
        account: typeof nextAccounts[0] === "string" ? nextAccounts[0] : "",
      }));
    };

    const handleChainChanged = (nextChainId: unknown) => {
      setState((current) => ({
        ...current,
        chainId: typeof nextChainId === "string" ? nextChainId : "",
      }));
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  return {
    account: state.account,
    connect,
    connecting: state.connecting,
    switchingNetwork: state.switchingNetwork,
    error: state.error,
    hasWallet: state.hasWallet,
    chainId: state.chainId,
    switchToLocalNetwork,
  };
};
