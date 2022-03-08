import { useForm } from 'react-hook-form'
import Button, { ButtonType } from './../../components/Button'
import { OperationVariables, ApolloQueryResult } from '@apollo/client'
import { toast } from 'react-toastify'
import {
  Transaction,
  PublicKey,
} from '@solana/web3.js'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { Marketplace, Nft, Offer } from '../../types'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata'

interface AcceptOfferFormProps {
  offer: Offer
  nft?: Nft
  marketplace: Marketplace
  refetch: (variables?: Partial<OperationVariables> | undefined) => Promise<ApolloQueryResult<_>>;
}

const { createExecuteSaleInstruction } = AuctionHouseProgram.instructions

const AcceptOfferForm = ({ offer, nft, marketplace, refetch }: AcceptOfferFormProps) => {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const acceptOfferForm = useForm()

  const acceptOfferTransaction = async () => {
    if (!publicKey || !signTransaction || !offer || !nft) {
      return
    }
    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(
      marketplace.auctionHouse.auctionHouseFeeAccount
    )
    const tokenMint = new PublicKey(nft.mintAddress)
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint)
    const auctionHouseTreasury = new PublicKey(
      marketplace.auctionHouse.auctionHouseTreasury
    )
    const [
      tokenAccount,
    ] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      tokenMint,
      new PublicKey(nft.owner.address)
    )

    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const [
      sellerTradeState,
    ] = await AuctionHouseProgram.findPublicBidTradeStateAddress(
      publicKey,
      auctionHouse,
      treasuryMint,
      tokenMint,
      offer.price,
      1
    )

    const [
      buyerTradeState,
    ] = await AuctionHouseProgram.findPublicBidTradeStateAddress(
      new PublicKey(offer.buyer),
      auctionHouse,
      treasuryMint,
      tokenMint,
      offer.price,
      1
    )

    const [
      escrowPaymentAccount,
      escrowPaymentBump,
    ] = await AuctionHouseProgram.findEscrowPaymentAccountAddress(
      auctionHouse,
      publicKey
    )

    const [
      programAsSigner,
      programAsSignerBump,
    ] = await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()

    const [
      freeTradeState,
      freeTradeStateBump,
    ] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      tokenAccount,
      treasuryMint,
      tokenMint,
      0,
      1
    )

    const executeSaleInstructionAccounts = {
      buyer: new PublicKey(offer.buyer),
      seller: publicKey,
      tokenAccount: tokenAccount,
      tokenMint: tokenMint,
      metadata: metadata,
      treasuryMint: treasuryMint,
      escrowPaymentAccount: escrowPaymentAccount,
      sellerPaymentReceiptAccount: publicKey,
      buyerReceiptTokenAccount: new PublicKey(offer.buyer),
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      auctionHouseTreasury: auctionHouseTreasury,
      buyerTradeState: buyerTradeState,
      sellerTradeState: sellerTradeState,
      freeTradeState: freeTradeState,
      programAsSigner: programAsSigner,
    }
    const executeSaleInstructionArgs = {
      escrowPaymentBump: escrowPaymentBump,
      freeTradeStateBump: freeTradeStateBump,
      programAsSignerBump: programAsSignerBump,
      buyerPrice: offer.price,
      tokenSize: 1,
    }

    const executeSaleInstruction = createExecuteSaleInstruction(
      executeSaleInstructionAccounts,
      executeSaleInstructionArgs
    )

    const txt = new Transaction()

    txt.add(executeSaleInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction

    try {
      signed = await signTransaction(txt)
    } catch (e) {
      toast.error(e.message)
      return
    }

    let signature: string = ''

    try {
      signature = await connection.sendRawTransaction(signed.serialize())

      toast('Sending the transaction to Solana.')

      await connection.confirmTransaction(signature, 'processed')

      await refetch();

      toast('The transaction was confirmed.')
    } catch {
      toast.error(
        <>
          The transaction failed.{' '}
          <a
            target='_blank'
            rel='noreferrer'
            href={`https://explorer.solana.com/tx/${signature}`}
          >
            View on explorer
          </a>
          .
        </>
      )
    }
  }

  return (
    <form
      className='flex-1'
      onSubmit={acceptOfferForm.handleSubmit(acceptOfferTransaction)}
    >
      <Button
        loading={acceptOfferForm.formState.isSubmitting}
        htmlType='submit'
        type={ButtonType.Primary}
      >
        Accept Offer
      </Button>
    </form>
  )
}

export default AcceptOfferForm
