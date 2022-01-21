import '../styles/globals.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/200.css'
import '@fontsource/material-icons'
import Link from 'next/link'
import type { AppProps } from 'next/app'
import { ApolloProvider } from '@apollo/client'
import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import { clusterApiUrl } from '@solana/web3.js';
import client from '../client';

function MyApp({ Component, pageProps }: AppProps) {
  const network = WalletAdapterNetwork.Devnet;

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SlopeWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolletWalletAdapter({ network }),
      new SolletExtensionWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <ApolloProvider client={client}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <div className="app-wrapper">
              <div className="flex items-center justify-between py-6 px-8 overlay-1">
                <Link href="/">
                  <a>
                    <h1 className="text-xl font-semibold">DAO Marketplace</h1>
                  </a>
                </Link>
                <div className="flex items-center justify-end gap-6">
                  <WalletMultiButton />
                  <WalletDisconnectButton />
                </div>
              </div>
              <Component {...pageProps} />
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ApolloProvider>
  )
}

export default MyApp
