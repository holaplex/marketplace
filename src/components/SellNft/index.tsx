import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata'
import {
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import { Nft, Marketplace } from '../../types'
import { toast } from 'react-toastify'
import { useRouter } from 'next/router';

const {
  createSellInstruction,
  createPrintListingReceiptInstruction,
} = AuctionHouseProgram.instructions

interface SellNftForm {
  amount: string
}

interface SellNftProps {
  nft: Nft
  marketplace: Marketplace
}

const SellNft = ({ nft, marketplace }: SellNftProps) => {
  const { control, watch, handleSubmit } = useForm<SellNftForm>({})
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()

  const sellNftTransaction = async ({ amount }: SellNftForm) => {
    const buyerPrice = Number(amount) * LAMPORTS_PER_SOL
    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(
      marketplace.auctionHouse.auctionHouseFeeAccount
    )
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint)
    const tokenMint = new PublicKey(nft.mintAddress)

    if (!publicKey || !signTransaction) {
      return
    }

    const [
      associatedTokenAccount,
    ] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      tokenMint,
      new PublicKey(nft.owner.address)
    )

    const [
      sellerTradeState,
      tradeStateBump,
    ] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      associatedTokenAccount,
      treasuryMint,
      tokenMint,
      buyerPrice,
      1
    )

    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const [
      programAsSigner,
      programAsSignerBump,
    ] = await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()

    const [
      freeTradeState,
      freeTradeBump,
    ] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      associatedTokenAccount,
      treasuryMint,
      tokenMint,
      0,
      1
    )

    const txt = new Transaction()

    const sellInstructionArgs = {
      tradeStateBump,
      freeTradeStateBump: freeTradeBump,
      programAsSignerBump: programAsSignerBump,
      buyerPrice,
      tokenSize: 1,
    }

    const sellInstructionAccounts = {
      wallet: publicKey,
      tokenAccount: associatedTokenAccount,
      metadata: metadata,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      sellerTradeState: sellerTradeState,
      freeSellerTradeState: freeTradeState,
      programAsSigner: programAsSigner,
    }

    const sellInstruction = createSellInstruction(
      sellInstructionAccounts,
      sellInstructionArgs
    )

    const [
      receipt,
      receiptBump,
    ] = await AuctionHouseProgram.findListingReceiptAddress(sellerTradeState)

    const printListingReceiptInstruction = createPrintListingReceiptInstruction(
      {
        receipt,
        bookkeeper: publicKey,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      {
        receiptBump,
      }
    )

    txt.add(sellInstruction).add(printListingReceiptInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    const signed = await signTransaction(txt)

    try {
      const signature = await connection.sendRawTransaction(signed.serialize())
      toast('Transaction Sent!')
      await connection.confirmTransaction(signature, 'processed')
    } catch {
      toast.error(
        'Something went wrong!  <a href={`https://explorer.solana.com/tx/${signature}`}>{TX: signature}</a>'
      )
    } finally {
      toast('Transaction successful!')
      return router.push(`/nfts/${nft.address}`)
    }
  }

  return (
    <form
      className='text-left grow'
      onSubmit={handleSubmit(sellNftTransaction)}
    >
      <h3 className='mb-6 text-xl font-bold md:text-2xl'>Sell this Nft</h3>
      <label className='block mb-1'>Price in SOL</label>
      <div className='prefix-input prefix-icon-sol'>
        <Controller
          control={control}
          name='amount'
          render={({ field: { onChange, value } }) => {
            const auctionHouseFeeBasisPoints = 200
            const amount = Number(value || 0) * LAMPORTS_PER_SOL

            const royalties = (amount * nft.sellerFeeBasisPoints) / 10000

            const auctionHouseFee =
              (amount * auctionHouseFeeBasisPoints) / 10000

            return (
              <>
                <div className='mb-4 sol-input'>
                  <input
                    autoFocus
                    value={value}
                    className='input'
                    onChange={(e: any) => {
                      onChange(e.target.value)
                    }}
                  />
                </div>
                <div className='flex flex-col gap-2 mb-4'>
                  <div className='flex justify-between'>
                    <span className='text-gray-400'>
                      {nft.sellerFeeBasisPoints / 100}% creator royalty
                    </span>
                    <div className='flex justify-center gap-2'>
                      <span className='icon-sol'></span>
                      <span>{royalties / LAMPORTS_PER_SOL}</span>
                    </div>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-400'>
                      {auctionHouseFeeBasisPoints / 100}% transaction fee
                    </span>
                    <div className='flex justify-center gap-2'>
                      <span className='icon-sol'></span>
                      <span>{auctionHouseFee / LAMPORTS_PER_SOL}</span>
                    </div>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-400'>You receive</span>
                    <div className='flex justify-center gap-2'>
                      <span className='icon-sol'></span>
                      <span>
                        {(amount - royalties - auctionHouseFee) /
                          LAMPORTS_PER_SOL}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )
          }}
        />
      </div>
      <div className='grid flex-grow grid-cols-2 gap-4'>
        <Link to={`/nfts/${nft.address}`}>
          <button className='w-full h-12 text-sm text-white transition-colors duration-150 bg-black rounded-full lg:text-xl md:text-base focus:shadow-outline hover:bg-black'>
            Cancel
          </button>
        </Link>
        <button className='h-12 text-sm text-black transition-colors duration-150 bg-white rounded-full lg:text-xl md:text-base focus:shadow-outline hover:bg-white'>
          List for sale
        </button>
      </div>
    </form>
  )
}

export default SellNft
