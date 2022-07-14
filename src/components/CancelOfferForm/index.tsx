import { useForm } from 'react-hook-form'
import { OperationVariables, ApolloQueryResult } from '@apollo/client'
import Button, { ButtonSize, ButtonType } from './../../components/Button'
import { toast } from 'react-toastify'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Wallet } from '@metaplex/js'
import {
  initMarketplaceSDK,
  Marketplace,
  Nft,
  Offer,
} from '@holaplex/marketplace-js-sdk'
import { useMemo } from 'react'

interface CancelOfferFormProps {
  offer: Offer
  nft?: Nft
  marketplace: Marketplace
  refetch: (
    variables?: Partial<OperationVariables> | undefined
  ) => Promise<ApolloQueryResult<_>>
}

const CancelOfferForm = ({
  offer,
  nft,
  marketplace,
  refetch,
}: CancelOfferFormProps) => {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const {
    formState: { isSubmitting },
    handleSubmit,
  } = useForm()

  const sdk = useMemo(
    () => initMarketplaceSDK(connection, wallet as Wallet),
    [connection, wallet]
  )

  const cancelOfferTransaction = async () => {
    if (!publicKey || !signTransaction || !offer || !nft) {
      return
    }

    try {
      toast('Sending the transaction to Solana.')
      await sdk
        .transaction()
        .add(
          sdk.offers(offer.auctionHouse).cancel({
            nft,
            offer,
          })
        )
        .add(
          sdk.escrow(offer.auctionHouse).withdraw({
            amount: offer.price.toNumber(),
          })
        )
        .send()

      await refetch()

      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      console.log('Cancel Offer Error', e)
      toast.error(e.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(cancelOfferTransaction)}>
      <Button
        loading={isSubmitting}
        htmlType="submit"
        size={ButtonSize.Small}
        type={ButtonType.Primary}
      >
        Cancel Offer
      </Button>
    </form>
  )
}
export default CancelOfferForm
