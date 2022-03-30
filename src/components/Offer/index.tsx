import React, { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { OperationVariables, ApolloQueryResult } from '@apollo/client'
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata'
import {
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import { toast } from 'react-toastify'
import { Nft, Marketplace } from './../../types'
import Button, { ButtonType } from './../Button'
import { useLogin } from '../../hooks/login'

const {
  createPublicBuyInstruction,
  createPrintBidReceiptInstruction,
  createDepositInstruction,
} = AuctionHouseProgram.instructions
interface OfferForm {
  amount: string
}

interface OfferProps {
  nft?: Nft
  marketplace: Marketplace
  refetch: (
    variables?: Partial<OperationVariables> | undefined
  ) => Promise<ApolloQueryResult<_>>
}

const Offer = ({ nft, marketplace, refetch }: OfferProps) => {
  const {
    handleSubmit,
    register,
    formState: { isSubmitting },
  } = useForm<OfferForm>({})
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const navigate = useNavigate()
  const login = useLogin()

  const placeOfferTransaction = async ({ amount }: OfferForm) => {
    if (!publicKey || !signTransaction) {
      login()
      return
    }

    if (!nft) {
      return
    }

    const buyerPrice = Number(amount) * LAMPORTS_PER_SOL
    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(
      marketplace.auctionHouse.auctionHouseFeeAccount
    )
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint)
    const tokenMint = new PublicKey(nft.mintAddress)

    const [tokenAccount] =
      await AuctionHouseProgram.findAssociatedTokenAccountAddress(
        tokenMint,
        new PublicKey(nft.owner.address)
      )

    const [escrowPaymentAccount, escrowPaymentBump] =
      await AuctionHouseProgram.findEscrowPaymentAccountAddress(
        auctionHouse,
        publicKey
      )

    const [buyerTradeState, tradeStateBump] =
      await AuctionHouseProgram.findPublicBidTradeStateAddress(
        publicKey,
        auctionHouse,
        treasuryMint,
        tokenMint,
        buyerPrice,
        1
      )

    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const txt = new Transaction()

    const depositInstructionAccounts = {
      wallet: publicKey,
      paymentAccount: publicKey,
      transferAuthority: publicKey,
      treasuryMint,
      escrowPaymentAccount,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
    }
    const depositInstructionArgs = {
      escrowPaymentBump,
      amount: buyerPrice,
    }

    const depositInstruction = createDepositInstruction(
      depositInstructionAccounts,
      depositInstructionArgs
    )

    const publicBuyInstruction = createPublicBuyInstruction(
      {
        wallet: publicKey,
        paymentAccount: publicKey,
        transferAuthority: publicKey,
        treasuryMint,
        tokenAccount,
        metadata,
        escrowPaymentAccount,
        authority,
        auctionHouse,
        auctionHouseFeeAccount,
        buyerTradeState,
      },
      {
        escrowPaymentBump,
        tradeStateBump,
        tokenSize: 1,
        buyerPrice,
      }
    )

    const [receipt, receiptBump] =
      await AuctionHouseProgram.findBidReceiptAddress(buyerTradeState)

    const printBidReceiptInstruction = createPrintBidReceiptInstruction(
      {
        receipt,
        bookkeeper: publicKey,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      {
        receiptBump,
      }
    )

    txt
      .add(depositInstruction)
      .add(publicBuyInstruction)
      .add(printBidReceiptInstruction)

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
    } finally {
      navigate(`/nfts/${nft.address}`)
    }
  }

  useEffect(() => {
    if (!nft || !publicKey) {
      return
    }

    if (nft.owner.address === publicKey.toBase58()) {
      navigate(`/nfts/${nft.address}`)
      return
    }
  }, [publicKey, nft, navigate])

  return (
    <form
      className="text-left grow mt-6"
      onSubmit={handleSubmit(placeOfferTransaction)}
    >
      <h3 className="mb-6 text-xl font-bold md:text-2xl">Make an offer</h3>
      <div className="mb-4 sol-input">
        <input
          {...register('amount', { required: true })}
          autoFocus
          className="input"
          placeholder="Price in SOL"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link to={`/nfts/${nft?.address}`}>
          <Button type={ButtonType.Secondary} block>
            Cancel
          </Button>
        </Link>
        <Button htmlType="submit" loading={isSubmitting} block>
          Place offer
        </Button>
      </div>
    </form>
  )
}

export default Offer
