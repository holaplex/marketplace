import { useForm } from 'react-hook-form'
import Button, { ButtonType } from './../../components/Button'
import { toast } from 'react-toastify'
import {
  Transaction,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { Marketplace, Nft, Listing, Offer } from '../../types'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'

interface CancelOfferFormProps {
  offer: Offer
  nft: Nft
  marketplace: Marketplace
}


const {
    createCancelInstruction,
    createCancelBidReceiptInstruction
  } = AuctionHouseProgram.instructions

const CancelOfferForm = ({ offer, nft, marketplace }: CancelOfferFormProps) => {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const cancelOfferForm = useForm()

  const cancelOfferTransaction = async () => {
    if (!publicKey || !signTransaction || !offer) {
      return
    }
    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(
      marketplace.auctionHouse.auctionHouseFeeAccount
    )
    const tokenMint = new PublicKey(nft.mintAddress)
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint)
    const receipt = new PublicKey(offer.address)
    const [
      tokenAccount,
    ] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      tokenMint,
      new PublicKey(nft.owner.address)
    )

    const [
      tradeState,
    ] = await AuctionHouseProgram.findPublicBidTradeStateAddress(
      publicKey,
      auctionHouse,
      treasuryMint,
      tokenMint,
      offer.price,
      1
    )

    const txt = new Transaction()

    const cancelInstructionAccounts = {
      wallet: publicKey,
      tokenAccount: tokenAccount,
      tokenMint: tokenMint,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      tradeState: tradeState,
    }

    const cancelInstructionArgs = {
      buyerPrice: offer.price,
      tokenSize: 1,
    }

    const cancelBidReceiptInstructionAccounts = {
      receipt: receipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const cancelBidInstruction = createCancelInstruction(
      cancelInstructionAccounts,
      cancelInstructionArgs
    )

    const cancelBidReceiptInstruction = createCancelBidReceiptInstruction(
      cancelBidReceiptInstructionAccounts
    )

    txt.add(cancelBidInstruction).add(cancelBidReceiptInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction

    try {
      signed = await signTransaction(txt)
    } catch (e: any) {
      toast.error(e.message)
      return
    }

    let signature: string  = ""

    try {
      signature = await connection.sendRawTransaction(signed.serialize())

      toast('Sending the transaction to Solana.')

      await connection.confirmTransaction(signature, 'processed')

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
      onSubmit={cancelOfferForm.handleSubmit(
        cancelOfferTransaction
      )}
    >
      <Button
        loading={cancelOfferForm.formState.isSubmitting}
        htmlType='submit'
        type={ButtonType.Primary}
      >
        Cancel Offer
      </Button>
    </form>
  )
}
export default CancelOfferForm;