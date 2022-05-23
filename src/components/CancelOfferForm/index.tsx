import { useForm } from 'react-hook-form'
import { OperationVariables, ApolloQueryResult } from '@apollo/client'
import Button, { ButtonSize, ButtonType } from './../../components/Button'
import { toast } from 'react-toastify'
import { Marketplace, Nft, Offer } from '../../types'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { OffersClient } from '@holaplex/marketplace-js-sdk'
import { Wallet } from '@metaplex/js'
import {
  Nft as NftFromSdk,
  Offer as OfferFromSdk,
} from '@holaplex/marketplace-js-sdk'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

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

  const cancelOfferTransaction = async () => {
    if (!publicKey || !signTransaction || !offer || !nft) {
      return
    }

    try {
      toast('Sending the transaction to Solana.')

      const offersClient = new OffersClient(
        connection,
        wallet as Wallet,
        marketplace.auctionHouse
      )
      await offersClient.cancel({
        amount: offer.price.toNumber() * LAMPORTS_PER_SOL,
        nft: nft as NftFromSdk,
        offer: offer as OfferFromSdk,
      })

      await refetch()

      toast.success('The transaction was confirmed.')
    } catch (e: any) {
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
