import { useState, useEffect, useCallback } from 'react'
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js'

type DisplayEncoding = 'utf8' | 'hex'
type PhantomEvent = 'disconnect' | 'connect' | 'accountChanged'
type PhantomRequestMethod =
  | 'connect'
  | 'disconnect'
  | 'signTransaction'
  | 'signAllTransactions'
  | 'signMessage'

interface ConnectOpts {
  onlyIfTrusted: boolean
}

interface PhantomProvider {
  publicKey: PublicKey | null
  isConnected: boolean | null
  signTransaction: (transaction: Transaction) => Promise<Transaction>
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>
  disconnect: () => Promise<void>
  on: (event: PhantomEvent, handler: (args: any) => void) => void
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>
}

const getProvider = (): PhantomProvider | undefined => {
  if ('solana' in window) {
    const anyWindow: any = window
    const provider = anyWindow.solana
    if (provider.isPhantom) {
      return provider
    }
  }
  window.open('https://phantom.app/', '_blank')
}

const NETWORK = clusterApiUrl('mainnet-beta')

export const Wallet = () => {
  const provider = getProvider()
  const [logs, setLogs] = useState<string[]>([])
  const addLog = useCallback(
    (log: string) => setLogs((logs) => [...logs, '> ' + log]),
    []
  )
  const connection = new Connection(NETWORK)
  const [, setConnected] = useState<boolean>(false)
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)
  useEffect(() => {
    if (!provider) return
    // try to eagerly connect
    provider.connect({ onlyIfTrusted: true }).catch((err) => {
      // fail silently
    })
    provider.on('connect', (publicKey: PublicKey) => {
      setPublicKey(publicKey)
      setConnected(true)
      addLog('[connect] ' + publicKey?.toBase58())
    })
    provider.on('disconnect', () => {
      setPublicKey(null)
      setConnected(false)
      addLog('[disconnect] 👋')
    })
    provider.on('accountChanged', (publicKey: PublicKey | null) => {
      setPublicKey(publicKey)
      if (publicKey) {
        addLog('[accountChanged] Switched account to ' + publicKey?.toBase58())
      } else {
        addLog('[accountChanged] Switched unknown account')
        // In this case, dapps could not to anything, or,
        // Only re-connecting to the new account if it is trusted
        // provider.connect({ onlyIfTrusted: true }).catch((err) => {
        //   // fail silently
        // });
        // Or, always trying to reconnect
        provider
          .connect()
          .then(() => addLog('[accountChanged] Reconnected successfully'))
          .catch((err) => {
            addLog('[accountChanged] Failed to re-connect: ' + err.message)
          })
      }
    })
    return () => {
      provider.disconnect()
    }
  }, [provider, addLog])
  if (!provider) {
    return <h2>Could not find a provider</h2>
  }

  return (
    <div>
      {provider && publicKey ? (
        <>
          <div>Connected as {publicKey.toBase58()}</div>

          <button
            onClick={async () => {
              try {
                await provider.disconnect()
              } catch (err) {
                console.warn(err)
                addLog('[error] disconnect: ' + JSON.stringify(err))
              }
            }}
          >
            Disconnect
          </button>
        </>
      ) : (
        <>
          <button
            onClick={async () => {
              try {
                await provider.connect()
              } catch (err) {
                console.warn(err)
                addLog('[error] connect: ' + JSON.stringify(err))
              }
            }}
          >
            Connect to Phantom
          </button>
        </>
      )}
    </div>
  )
}
