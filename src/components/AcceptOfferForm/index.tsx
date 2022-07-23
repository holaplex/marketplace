import { useForm } from 'react-hook-form'
import Button, { ButtonSize, ButtonType } from './../../components/Button'
import { OperationVariables, ApolloQueryResult } from '@apollo/client'
import { toast } from 'react-toastify'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Wallet } from '@metaplex/js'
import {
  initMarketplaceSDK,
  AhListing,
  Nft,
  Offer,
} from '@holaplex/marketplace-js-sdk'
import { useContext, useMemo } from 'react'
import {
  Action,
  MultiTransactionContext,
} from '../../modules/multi-transaction'

interface AcceptOfferFormProps {
  offer: Offer
  listing?: AhListing
  nft?: Nft
  refetch: (
    variables?: Partial<OperationVariables> | undefined
  ) => Promise<ApolloQueryResult<_>>
}

const AcceptOfferForm = ({
  offer,
  nft,
  listing,
  refetch,
}: AcceptOfferFormProps) => {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const sdk = useMemo(
    () => initMarketplaceSDK(connection, wallet as Wallet),
    [connection, wallet]
  )
  const { runActions } = useContext(MultiTransactionContext)

  const {
    formState: { isSubmitting },
    handleSubmit,
  } = useForm()

  const onAcceptOffer = async () => {
    if (!offer || !nft || !offer.auctionHouse) {
      return
    }

    toast('Sending the transaction to Solana.')
    await sdk
      .transaction()
      .add(
        sdk.offers(offer.auctionHouse).accept({
          nft,
          offer,
        })
      )
      .send()
  }

  const onCancelListing = (listing: AhListing) => async () => {
    if (!offer || !nft || !offer.auctionHouse) {
      return
    }

    await sdk
      .transaction()
      .add(sdk.listings(offer.auctionHouse).cancel({ listing, nft }))
      .send()
  }

  const acceptOfferTransaction = async () => {
    if (!publicKey || !signTransaction || !offer || !nft) {
      return
    }

    let newActions: Action[] = []

    if (listing) {
      newActions = [
        {
          name: 'Cancel previous listing...',
          id: 'cancelListing',
          action: onCancelListing(listing),
          param: undefined,
        },
      ]
    }

    newActions = [
      ...newActions,
      {
        name: 'Accepting offer...',
        id: 'acceptOffer',
        action: onAcceptOffer,
        param: undefined,
      },
    ]

    await runActions(newActions, {
      onActionSuccess: async () => {
        toast.success('The transaction was confirmed.')
      },
      onComplete: async () => {
        await refetch()
      },
      onActionFailure: async (err) => {
        await refetch()
        toast.error(err.message)
      },
    })
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
