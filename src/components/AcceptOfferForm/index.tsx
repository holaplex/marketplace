import { useForm } from 'react-hook-form'
import Button, { ButtonSize, ButtonType } from './../../components/Button'
import { OperationVariables, ApolloQueryResult } from '@apollo/client'
import { toast } from 'react-toastify'
import { Listing, Marketplace, Nft, Offer } from '../../types'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { OffersClient } from '@holaplex/marketplace-js-sdk'
import { Wallet } from '@metaplex/js'
import {
  Listing as ListingFromSdk,
  Nft as NftFromSdk,
  Offer as OfferFromSdk,
} from '@holaplex/marketplace-js-sdk'

interface AcceptOfferFormProps {
  offer: Offer
  listing?: Listing
  nft?: Nft
  marketplace: Marketplace
  refetch: (
    variables?: Partial<OperationVariables> | undefined
  ) => Promise<ApolloQueryResult<_>>
}

const AcceptOfferForm = ({
  offer,
  nft,
  marketplace,
  listing,
  refetch,
}: AcceptOfferFormProps) => {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const {
    formState: { isSubmitting },
    handleSubmit,
  } = useForm()

  const acceptOfferTransaction = async () => {
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
      await offersClient.accept({
        cancel: [listing] as ListingFromSdk[],
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
    <form onSubmit={handleSubmit(acceptOfferTransaction)}>
      <Button
        loading={isSubmitting}
        htmlType="submit"
        size={ButtonSize.Small}
        type={ButtonType.Primary}
      >
        Accept Offer
      </Button>
    </form>
  )
}

export default AcceptOfferForm
