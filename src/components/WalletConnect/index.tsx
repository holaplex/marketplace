import { useState, useEffect, useCallback } from 'react'
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js'
import { Button } from '../../common/Button'
import { shortenAddress } from '../../utils/utils'

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

export const WalletConnect = () => {
  const provider = getProvider()
  const connection = new Connection(NETWORK)
  const [, setConnected] = useState<boolean>(false)
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null)
  useEffect(() => {
    if (!provider) return
    provider.connect({ onlyIfTrusted: true }).catch((err) => {
      console.log(err.message)
    })
    provider.on('connect', (publicKey: PublicKey) => {
      setPublicKey(publicKey)
      setConnected(true)
    })
    provider.on('disconnect', () => {
      setPublicKey(null)
      setConnected(false)
    })
    provider.on('accountChanged', (publicKey: PublicKey | null) => {
      setPublicKey(publicKey)
      if (!publicKey) {
        provider.connect().catch((err) => {
          console.warn(err.message)
        })
      }
    })
    return () => {
      provider.disconnect()
    }
  }, [provider])
  if (!provider) {
    return <></>
  }

  return (
    <div>
      {provider && publicKey ? (
        <div className="flex gap-6 items-center">
          <span className="pubkey">{shortenAddress(publicKey.toBase58())}</span>
          <Button
            onClick={async () => {
              try {
                await provider.disconnect()
              } catch (err) {
                console.warn(err)
              }
            }}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          onClick={async () => {
            try {
              await provider.connect()
            } catch (err) {
              console.warn(err)
            }
          }}
        >
          Connect
        </Button>
      )}
    </div>
  )
}
