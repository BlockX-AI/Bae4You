"use client";

import { createContext, useContext } from "react";
import type { ethers } from "ethers";

export interface AuthState {
  address:  string | null;
  jwt:      string | null;
  user:     Record<string, unknown> | null;
  provider: ethers.BrowserProvider | null;
  signer:   ethers.JsonRpcSigner   | null;
}

export interface AuthCtx extends AuthState {
  login:           () => Promise<void>;
  logout:          () => void;
  walletModalOpen: boolean;
  openWalletModal: () => void;
}

export const AuthContext = createContext<AuthCtx>({
  address:         null,
  jwt:             null,
  user:            null,
  provider:        null,
  signer:          null,
  login:           async () => {},
  logout:          () => {},
  walletModalOpen: false,
  openWalletModal: () => {},
});

export const useAuth = () => useContext(AuthContext);
