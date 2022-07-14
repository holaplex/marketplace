import { useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-toastify'
import Button, { ButtonSize, ButtonType } from './../Button'
import { initMarketplaceSDK, Marketplace } from '@holaplex/marketplace-js-sdk'
import { useLogin } from './../../hooks/login'
import { Connection, Wallet } from '@metaplex/js'
import { AuctionHouse } from '@holaplex/marketplace-js-sdk/dist/types'
import { useTokenList } from './../../hooks/tokenList'
import { TokenInfo } from '@solana/spl-token-registry'

interface EmptyTreasuryWalletFormProps {
  marketplace: Marketplace
  token?: TokenInfo
}

export const EmptyTreasuryWalletForm = ({
  marketplace,
  token,
}: EmptyTreasuryWalletFormProps) => {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const sdk = useMemo(
    () => initMarketplaceSDK(connection, wallet as Wallet),
    [connection, wallet]
  )
  const login = useLogin()
  const [withdrawlLoading, setWithdrawlLoading] = useState(false)

  const claimFunds = async (ah: AuctionHouse) => {
    if (!publicKey || !signTransaction || !wallet) {
      login()
      return
    }

    try {
      toast.info('Please approve the transaction.')
      setWithdrawlLoading(true)
      await sdk.claimFunds(ah)
      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setWithdrawlLoading(false)
    }
  }

  return (
    <Button
      className="px-4"
      disabled={withdrawlLoading}
      onClick={async () =>
        await claimFunds(
          marketplace.auctionHouses?.filter(
            (ah) => ah.treasuryMint === token?.address
          )[0]!
        )
      }
      type={ButtonType.Primary}
      size={ButtonSize.Small}
      loading={withdrawlLoading}
    >
      Redeem {token?.symbol}
    </Button>
  )
}
