import '@dialectlabs/react-ui/index.css'
import '../styles/globals.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/200.css'
import '@fontsource/material-icons'
import 'react-multi-carousel/lib/styles.css'
import type { AppProps } from 'next/app'
import { ApolloProvider } from '@apollo/client'
import React, { ReactNode, useMemo } from 'react'
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  GlowWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'
import { NextPage } from 'next'
import { Cluster } from '@solana/web3.js'
import client from '../client'
import { ToastContainer } from 'react-toastify'
import { ViewerProvider } from './../providers/Viewer'
import 'react-toastify/dist/ReactToastify.css'

const network = WalletAdapterNetwork.Mainnet

const CLUSTER_API_URL = 'https://holaplex.rpcpool.com' //'http://api.devnet.solana.com'

const clusterApiUrl = (cluster: Cluster): string => CLUSTER_API_URL

type NextPageWithLayout = NextPage & {
  getLayout?: ({ children: ReactNode }) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

function App({ Component, pageProps }: AppPropsWithLayout) {
  const endpoint = useMemo(() => clusterApiUrl(network), [])
  const wallets = useMemo(
    () => [
      new GlowWalletAdapter(),
      new PhantomWalletAdapter(),
      new SlopeWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolletWalletAdapter({ network }),
      new SolletExtensionWalletAdapter({ network }),
    ],
    []
  )

  const Layout = Component.getLayout ?? (({ children }) => children)

  return (
    <ApolloProvider client={client}>
      <ConnectionProvider
        endpoint={endpoint}
        config={{ confirmTransactionInitialTimeout: 90 * 1000 }}
      >
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider className="wallet-modal-theme">
            <ViewerProvider>
              <ToastContainer
                theme="dark"
                hideProgressBar={true}
                position="bottom-center"
                className="w-full max-w-full font-sans text-sm text-white bottom-4 sm:right-4 sm:left-auto sm:w-96 sm:translate-x-0"
                toastClassName="bg-gray-900 bg-opacity-80 rounded-lg items-center"
              />
              <Layout {...pageProps}>
                <Component {...pageProps} />
              </Layout>
            </ViewerProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ApolloProvider>
  )
}

export default App
