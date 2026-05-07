"use client";

import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import { getNonce, siweVerify, setJwt } from "./api";

const CHAIN_ID  = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532");
const CHAIN_NAME = "Base Sepolia";
const RPC_URL    = "https://sepolia.base.org";
const INAPP_KEY  = "bae4u_inapp_pk";

export function getOrCreateInAppKey(): string {
  if (typeof window === "undefined") throw new Error("Not in browser");
  let pk = localStorage.getItem(INAPP_KEY);
  if (!pk) {
    const w = ethers.Wallet.createRandom();
    pk = w.privateKey;
    localStorage.setItem(INAPP_KEY, pk);
  }
  return pk;
}

export async function connectInAppWallet(): Promise<{
  address:  string;
  jwt:      string;
  provider: ethers.JsonRpcProvider;
  signer:   ethers.Wallet;
}> {
  const pk       = getOrCreateInAppKey();
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(pk, provider);
  const address  = await wallet.getAddress();
  const nonce    = await getNonce(address);

  const msg = new SiweMessage({
    domain:    window.location.host,
    address,
    statement: "Sign in to Bae4U with in-app wallet",
    uri:       window.location.origin,
    version:   "1",
    chainId:   CHAIN_ID,
    nonce,
  });
  const prepared  = msg.prepareMessage();
  const signature = await wallet.signMessage(prepared);
  const jwt       = await siweVerify(prepared, signature);
  if (!jwt) throw new Error("SIWE verification failed");

  setJwt(jwt);
  return { address, jwt, provider, signer: wallet };
}

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "YOUR_WALLETCONNECT_PROJECT_ID";

export async function getProvider(): Promise<ethers.BrowserProvider | null> {
  if (typeof window === "undefined") return null;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  return new ethers.BrowserProvider(eth);
}

async function siweWithProvider(
  provider: ethers.BrowserProvider,
  statement = "Sign in to Bae4U — the social dating universe"
): Promise<{ address: string; jwt: string; provider: ethers.BrowserProvider; signer: ethers.JsonRpcSigner }> {
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: `0x${CHAIN_ID.toString(16)}` }]);
    } catch {
      await provider.send("wallet_addEthereumChain", [{
        chainId:            `0x${CHAIN_ID.toString(16)}`,
        chainName:          CHAIN_NAME,
        rpcUrls:            [RPC_URL],
        nativeCurrency:     { name: "ETH", symbol: "ETH", decimals: 18 },
        blockExplorerUrls:  ["https://sepolia.basescan.org"],
      }]);
    }
  }

  const signer    = await provider.getSigner();
  const address   = await signer.getAddress();
  const nonce     = await getNonce(address);

  const msg = new SiweMessage({
    domain:   window.location.host,
    address,
    statement,
    uri:      window.location.origin,
    version:  "1",
    chainId:  CHAIN_ID,
    nonce,
  });
  const prepared  = msg.prepareMessage();
  const signature = await signer.signMessage(prepared);
  const jwt       = await siweVerify(prepared, signature);
  if (!jwt) throw new Error("SIWE verification failed — no JWT returned");

  setJwt(jwt);
  return { address, jwt, provider, signer };
}

export async function connectAndLogin(): Promise<{
  address: string;
  jwt: string;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
}> {
  const provider = await getProvider();
  if (!provider) throw new Error("No wallet found. Install MetaMask or use WalletConnect.");
  await provider.send("eth_requestAccounts", []);
  return siweWithProvider(provider);
}

export async function connectWalletConnect(): Promise<{
  address: string;
  jwt: string;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
}> {
  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
  const wcProvider = await EthereumProvider.init({
    projectId:    WC_PROJECT_ID,
    chains:       [CHAIN_ID],
    showQrModal:  true,
    metadata: {
      name:        "Bae4U",
      description: "The social dating universe on-chain",
      url:         typeof window !== "undefined" ? window.location.origin : "https://bae4u.app",
      icons:       ["https://bae4u.app/icon.png"],
    },
  });

  await wcProvider.connect();
  const provider = new ethers.BrowserProvider(wcProvider as any);
  return siweWithProvider(provider, "Sign in to Bae4U via WalletConnect");
}

export async function connectCoinbaseWallet(): Promise<{
  address: string;
  jwt: string;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
}> {
  const { CoinbaseWalletSDK } = await import("@coinbase/wallet-sdk");
  const sdk = new CoinbaseWalletSDK({
    appName:   "Bae4U",
    appLogoUrl: typeof window !== "undefined" ? `${window.location.origin}/icon.png` : undefined,
  });

  const cbEthProvider = sdk.makeWeb3Provider();
  await (cbEthProvider as any).request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(cbEthProvider as any);
  return siweWithProvider(provider, "Sign in to Bae4U via Coinbase Wallet");
}

export async function sendSignedTx(
  signer: ethers.JsonRpcSigner,
  step: { to: string; data: string; value: string; gasLimit: string; chainId: number }
): Promise<string> {
  const tx = await signer.sendTransaction({
    to:       step.to,
    data:     step.data as `0x${string}`,
    value:    BigInt(step.value),
    gasLimit: BigInt(step.gasLimit),
  });
  return tx.hash;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
