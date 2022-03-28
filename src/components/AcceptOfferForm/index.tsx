import { useForm } from 'react-hook-form'
import Button, { ButtonSize, ButtonType } from './../../components/Button'
import { OperationVariables, ApolloQueryResult } from '@apollo/client'
import { toast } from 'react-toastify'
import {
  Transaction,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { Listing, Marketplace, Nft, Offer } from '../../types'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata'
import { concat } from 'ramda'
import {
  createCancelInstruction,
  createCancelListingReceiptInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated/instructions'

interface AcceptOfferFormProps {
  offer: Offer
  listing?: Listing
  nft?: Nft
  marketplace: Marketplace
  refetch: (
    variables?: Partial<OperationVariables> | undefined
  ) => Promise<ApolloQueryResult<_>>
}

const {
  createSellInstruction,
  createPrintListingReceiptInstruction,
  createExecuteSaleInstruction,
  createPrintPurchaseReceiptInstruction,
} = AuctionHouseProgram.instructions

const AcceptOfferForm = ({
  offer,
  nft,
  marketplace,
  listing,
  refetch,
}: AcceptOfferFormProps) => {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const {
    formState: { isSubmitting },
    handleSubmit,
  } = useForm()

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
    const [tokenAccount] =
      await AuctionHouseProgram.findAssociatedTokenAccountAddress(
        tokenMint,
        new PublicKey(nft.owner.address)
      )

    const bidReceipt = new PublicKey(offer.address)
    const buyerPubkey = new PublicKey(offer.buyer)

    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const [sellerTradeState, sellerTradeStateBump] =
      await AuctionHouseProgram.findTradeStateAddress(
        publicKey,
        auctionHouse,
        tokenAccount,
        treasuryMint,
        tokenMint,
        offer.price.toNumber(),
        1
      )

    const [buyerTradeState] =
      await AuctionHouseProgram.findPublicBidTradeStateAddress(
        buyerPubkey,
        auctionHouse,
        treasuryMint,
        tokenMint,
        offer.price.toNumber(),
        1
      )

    const [purchaseReceipt, purchaseReceiptBump] =
      await AuctionHouseProgram.findPurchaseReceiptAddress(
        sellerTradeState,
        buyerTradeState
      )

    const [escrowPaymentAccount, escrowPaymentBump] =
      await AuctionHouseProgram.findEscrowPaymentAccountAddress(
        auctionHouse,
        buyerPubkey
      )

    const [programAsSigner, programAsSignerBump] =
      await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()

    const [freeTradeState, freeTradeStateBump] =
      await AuctionHouseProgram.findTradeStateAddress(
        publicKey,
        auctionHouse,
        tokenAccount,
        treasuryMint,
        tokenMint,
        0,
        1
      )

    const [buyerReceiptTokenAccount] =
      await AuctionHouseProgram.findAssociatedTokenAccountAddress(
        tokenMint,
        buyerPubkey
      )

    const [listingReceipt, listingReceiptBump] =
      await AuctionHouseProgram.findListingReceiptAddress(sellerTradeState)

    const sellInstructionAccounts = {
      wallet: publicKey,
      tokenAccount,
      metadata,
      authority,
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
      tokenSize: 1,
    }

    const printListingReceiptInstructionAccounts = {
      receipt: listingReceipt,
      bookkeeper: publicKey,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const printListingReceiptInstructionArgs = {
      receiptBump: listingReceiptBump,
    }

    const executeSaleInstructionAccounts = {
      buyer: buyerPubkey,
      seller: publicKey,
      auctionHouse,
      tokenAccount,
      tokenMint,
      treasuryMint,
      metadata,
      authority,
      sellerTradeState,
      buyerTradeState,
      freeTradeState,
      sellerPaymentReceiptAccount: publicKey,
      escrowPaymentAccount,
      buyerReceiptTokenAccount,
      auctionHouseFeeAccount,
      auctionHouseTreasury,
      programAsSigner,
    }
    const executeSaleInstructionArgs = {
      escrowPaymentBump,
      freeTradeStateBump,
      programAsSignerBump,
      buyerPrice: offer.price,
      tokenSize: 1,
    }
    const executePrintPurchaseReceiptInstructionAccounts = {
      purchaseReceipt,
      listingReceipt,
      bidReceipt,
      bookkeeper: publicKey,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const executePrintPurchaseReceiptInstructionArgs = {
      purchaseReceiptBump: purchaseReceiptBump,
    }

    const createListingInstruction = createSellInstruction(
      sellInstructionAccounts,
      sellInstructionArgs
    )
    const createPrintListingInstruction = createPrintListingReceiptInstruction(
      printListingReceiptInstructionAccounts,
      printListingReceiptInstructionArgs
    )
    const executeSaleInstruction = createExecuteSaleInstruction(
      executeSaleInstructionAccounts,
      executeSaleInstructionArgs
    )
    const executePrintPurchaseReceiptInstruction =
      createPrintPurchaseReceiptInstruction(
        executePrintPurchaseReceiptInstructionAccounts,
        executePrintPurchaseReceiptInstructionArgs
      )

    const txt = new Transaction()

    txt
      .add(createListingInstruction)
      .add(createPrintListingInstruction)
      .add(
        new TransactionInstruction({
          programId: AuctionHouseProgram.PUBKEY,
          data: executeSaleInstruction.data,
          keys: concat(
            executeSaleInstruction.keys,
            nft.creators.map((creator) => ({
              pubkey: new PublicKey(creator.address),
              isSigner: false,
              isWritable: true,
            }))
          ),
        })
      )
      .add(executePrintPurchaseReceiptInstruction)

    if (listing) {
      const cancelInstructionAccounts = {
        wallet: publicKey,
        tokenAccount,
        tokenMint,
        authority,
        auctionHouse,
        auctionHouseFeeAccount,
        tradeState: new PublicKey(listing.tradeState),
      }
      const cancelListingInstructionArgs = {
        buyerPrice: listing.price,
        tokenSize: 1,
      }

      const cancelListingReceiptAccounts = {
        receipt: new PublicKey(listing.address),
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      }

      const cancelListingInstruction = createCancelInstruction(
        cancelInstructionAccounts,
        cancelListingInstructionArgs
      )

      const cancelListingReceiptInstruction =
        createCancelListingReceiptInstruction(cancelListingReceiptAccounts)

      txt.add(cancelListingInstruction).add(cancelListingReceiptInstruction)
    }

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction | undefined = undefined

    try {
      signed = await signTransaction(txt)
    } catch (e: any) {
      toast.error(e.message)
      return
    }

    let signature: string | undefined = undefined

    try {
      toast('Sending the transaction to Solana.')

      signature = await connection.sendRawTransaction(signed.serialize())

      await connection.confirmTransaction(signature, 'confirmed')

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
