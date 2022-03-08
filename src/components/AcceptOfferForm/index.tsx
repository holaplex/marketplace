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

const {
  createSellInstruction,
  createPrintListingReceiptInstruction,
  createExecuteSaleInstruction,
  createPrintPurchaseReceiptInstruction,
} = AuctionHouseProgram.instructions

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

    const bidReceipt = new PublicKey(offer.address)
    const buyerPubkey = new PublicKey(offer.buyer)


    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const [
      sellerTradeState,sellerTradeStateBump
    ] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      tokenAccount,
      treasuryMint,
      tokenMint,
      offer.price,
      1
    )

    const [
      buyerTradeState,
    ] = await AuctionHouseProgram.findPublicBidTradeStateAddress(
      buyerPubkey,
      auctionHouse,
      treasuryMint,
      tokenMint,
      offer.price,
      1
    )

    const [
      purchaseReceipt,purchaseReceiptBump
    ] = await AuctionHouseProgram.findPurchaseReceiptAddress(sellerTradeState,buyerTradeState)
    


    const [
      escrowPaymentAccount,
      escrowPaymentBump,
    ] = await AuctionHouseProgram.findEscrowPaymentAccountAddress(
      auctionHouse,
      buyerPubkey
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

    const [
      buyerReceiptTokenAccount,
    ] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      publicKey,
      tokenMint
    )

    const [listingReceipt, listingReceiptBump] = await AuctionHouseProgram.findListingReceiptAddress(sellerTradeState)

    const sellInstructionAccounts = {
      wallet: publicKey,
      tokenAccount: tokenAccount,
      metadata: metadata,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      sellerTradeState: sellerTradeState,
      freeSellerTradeState: freeTradeState,
      programAsSigner: programAsSigner,
    }
    
    const sellInstructionArgs = {
      tradeStateBump: sellerTradeStateBump,
      freeTradeStateBump: freeTradeStateBump,
      programAsSignerBump: programAsSignerBump,
      buyerPrice: offer.price,
      tokenSize: 1
    }

    const printListingReceiptInstructionAccounts = {
      receipt: listingReceipt,
      bookkeeper: publicKey,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const printListingReceiptInstructionArgs = {
      receiptBump: listingReceiptBump
    }

    const executeSaleInstructionAccounts = {
      buyer: buyerPubkey,
      seller: publicKey,
      tokenAccount: tokenAccount,
      tokenMint: tokenMint,
      metadata: metadata,
      treasuryMint: treasuryMint,
      escrowPaymentAccount: escrowPaymentAccount,
      sellerPaymentReceiptAccount: publicKey,
      buyerReceiptTokenAccount: buyerReceiptTokenAccount,
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
    const executePrintPurchaseReceiptInstructionAccounts = {
      purchaseReceipt: purchaseReceipt,
      listingReceipt: listingReceipt,
      bidReceipt: bidReceipt,
      bookkeeper: publicKey,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const executePrintPurchaseReceiptInstructionArgs = {
      purchaseReceiptBump: purchaseReceiptBump
    }


    const createListingInstruction = createSellInstruction(sellInstructionAccounts, sellInstructionArgs)
    const createPrintListingInstruction = createPrintListingReceiptInstruction(printListingReceiptInstructionAccounts, printListingReceiptInstructionArgs)
    const executeSaleInstruction = createExecuteSaleInstruction(executeSaleInstructionAccounts,executeSaleInstructionArgs)
    const executePrintPurchaseReceiptInstruction = createPrintPurchaseReceiptInstruction(executePrintPurchaseReceiptInstructionAccounts,executePrintPurchaseReceiptInstructionArgs)

    const txt = new Transaction()

    txt
    .add(createListingInstruction)
    .add(createPrintListingInstruction)
    .add(executeSaleInstruction)
    .add(executePrintPurchaseReceiptInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction

    try {
      signed = await signTransaction(txt)
    } catch (e: any) {
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
