import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["gateway.pinata.cloud", "ipfs.io", "cloudflare-ipfs.com"],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ?? "https://baebackend-production.up.railway.app",
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532",
    NEXT_PUBLIC_PETS_CASH_ADDRESS:
      process.env.NEXT_PUBLIC_PETS_CASH_ADDRESS ?? "0x468577EB93f248c770036bFC7EFb5639DD66fF13",
    NEXT_PUBLIC_PETS_MARKET_ADDRESS:
      process.env.NEXT_PUBLIC_PETS_MARKET_ADDRESS ?? "0xa21eA1176bd8c58870e22B0455A4B3B6eF06FfeF",
    NEXT_PUBLIC_PETS_REGISTRY_ADDRESS:
      process.env.NEXT_PUBLIC_PETS_REGISTRY_ADDRESS ?? "0x3E86590FE85536a194693eBC83be224De1412aca",
  },
};

export default nextConfig;
