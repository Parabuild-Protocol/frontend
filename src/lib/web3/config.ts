// src/lib/web3/config.ts
import { createAppKit } from "@reown/appkit/react";
import { mainnet, sepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient } from "@tanstack/react-query";

// 1. Get projectId from https://cloud.reown.com
export const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID || "c76aa6407eb4e1ce55c2a94c47fde81d";

if (!projectId) {
  throw new Error("VITE_REOWN_PROJECT_ID is not set");
}

// 2. Set up Wagmi adapter
export const networks = [mainnet, sepolia];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
});

// 3. Create modal
export const metadata = {
  name: "ParaBuild",
  description: "Platform for contributing to open source projects",
  url: "https://parabuild.xyz/",
  icons: ["https://parabuild.xyz/icon.png"],
};


export const createWeb3Modal = () => {
  return createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    features: {
      analytics: true,
      email: false,
      socials: false,
      emailShowWallets: true,
    },
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "hsl(var(--primary))",
      "--w3m-border-radius-master": "8px",
    },
  });
};

export const queryClient = new QueryClient();
