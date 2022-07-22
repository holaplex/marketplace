import { useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-toastify'
import Button, { ButtonSize, ButtonType } from './../Button'
import { initMarketplaceSDK, AuctionHouse } from '@holaplex/marketplace-js-sdk'
import { useLogin } from './../../hooks/login'
import { Connection, Wallet } from '@metaplex/js'
import { useTokenList } from './../../hooks/tokenList'
import { TokenInfo } from '@solana/spl-token-registry'

interface EmptyTreasuryWalletFormProps {
  onEmpty: () => Promise<void>
  token?: TokenInfo
}

export const EmptyTreasuryWalletForm = ({
  onEmpty,
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

  const claimFunds = async () => {
    if (!publicKey || !signTransaction || !wallet) {
      login()
      return
    }

    try {
      toast.info('Please approve the transaction.')
      setWithdrawlLoading(true)
      await onEmpty()
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
      onClick={async () => await claimFunds()}
      type={ButtonType.Primary}
      size={ButtonSize.Small}
      loading={withdrawlLoading}
    >
      Redeem {token?.symbol}
    </Button>
  )
}
