"use client";

import { useState, useEffect, useCallback } from "react";
import type { ethers } from "ethers";
import { AuthContext, type AuthState } from "@/lib/store";
import { connectAndLogin, connectInAppWallet, connectWalletConnect, connectCoinbaseWallet } from "@/lib/wallet";
import { getMe, clearJwt, getJwt, setupWallet } from "@/lib/api";
import WalletModal from "@/components/wallet-modal";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    address:  null,
    jwt:      null,
    user:     null,
    provider: null,
    signer:   null,
  });
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const openWalletModal = useCallback(() => setWalletModalOpen(true), []);

  const login = useCallback(async () => { openWalletModal(); }, [openWalletModal]);

  const handleMetaMask = useCallback(async () => {
    const { address, jwt, provider, signer } = await connectAndLogin();
    const user = await getMe();
    setState({ address, jwt, user, provider, signer: signer as unknown as ethers.JsonRpcSigner });
    setWalletModalOpen(false);
  }, []);

  const handleWalletConnect = useCallback(async () => {
    const { address, jwt, provider, signer } = await connectWalletConnect();
    const user = await getMe();
    setState({ address, jwt, user, provider, signer: signer as unknown as ethers.JsonRpcSigner });
    setWalletModalOpen(false);
  }, []);

  const handleCoinbase = useCallback(async () => {
    const { address, jwt, provider, signer } = await connectCoinbaseWallet();
    const user = await getMe();
    setState({ address, jwt, user, provider, signer: signer as unknown as ethers.JsonRpcSigner });
    setWalletModalOpen(false);
  }, []);

  const handleInApp = useCallback(async (walletType: "custodial" | "cdp") => {
    const { address, jwt, provider, signer } = await connectInAppWallet();
    try { await setupWallet(walletType); } catch {}
    const user = await getMe();
    setState({ address, jwt, user, provider: provider as unknown as ethers.BrowserProvider, signer: signer as unknown as ethers.JsonRpcSigner });
    setWalletModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    clearJwt();
    setState({ address: null, jwt: null, user: null, provider: null, signer: null });
  }, []);

  useEffect(() => {
    const saved = getJwt();
    if (!saved) return;
    getMe()
      .then((user) => setState((s) => ({ ...s, jwt: saved, user })))
      .catch(() => clearJwt());
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, walletModalOpen, openWalletModal }}>
      {children}
      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onMetaMask={handleMetaMask}
        onWalletConnect={handleWalletConnect}
        onCoinbase={handleCoinbase}
        onInApp={() => handleInApp("custodial")}
        onCdp={() => handleInApp("cdp")}
      />
    </AuthContext.Provider>
  );
}
