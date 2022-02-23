import React, { useState }  from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Link } from 'react-router-dom'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import * as anchor from '@project-serum/anchor'
import { NATIVE_MINT } from '@solana/spl-token'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'

const { createSellInstruction } = AuctionHouseProgram.instructions

interface OfferForm {
  amount: string
}

interface OfferProps {
  nft: any
}

const SellNft = ({ nft }: OfferProps) => {
  const { control, watch, register, handleSubmit } = useForm<OfferForm>({})
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [sellAmount, setSellAmount] = useState(0)

  const sellNftTransaction = async () => {
    const sellPrice = String(Number(sellAmount) * LAMPORTS_PER_SOL)

    // NOTE: always 1 for NFTs since they are spl token with count of 1
    const tokenSize = '1'
    // TODO: read auction house from indexer
    const auctionHouse = new PublicKey('BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR')
    console.log(auctionHouse)
    // TODO: read authority from auction house record (auctionHouse.authority)
    const authority = new PublicKey(
      'BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR'
    )
    const auctionHouseFeeAccount = new PublicKey(
      'BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR'
    )
    // TODO: compute ata for owner with token_account and metadata.mint
    const tokenAccount = new PublicKey(
      'BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR'
    )
    const tokenMint = new PublicKey(nft.mintAddress)

    if (!publicKey || !signTransaction) {
      return
    }

    // Find TradeState Account
    const [
      sellerTradeState,
      tradeStateBump,
    ] = await AuctionHouseProgram.findTradeStateAccount(
      publicKey,
      auctionHouse,
      tokenAccount,
      NATIVE_MINT,
      tokenMint,
      sellPrice,
      tokenSize
    )

    const associatedTokenAccount = (
      await AuctionHouseProgram.getAtaForMint(tokenMint, new PublicKey(nft.owner.address)) 
    )[0]

    const metadata = await AuctionHouseProgram.getMetadata(tokenMint)

    const [
      programAsSigner,
      programAsSignerBump,
    ] = await AuctionHouseProgram.getAuctionHouseProgramAsSigner()

    const [
      freeTradeState,
      freeTradeBump,
    ]  = await AuctionHouseProgram.getAuctionHouseTradeState(
      auctionHouse,
      publicKey,
      associatedTokenAccount,
      NATIVE_MINT,
      tokenMint,
      1,
      0
    )

    // make transaction
    const txt = new Transaction()

    const sellInstructionArgs = {
      tradeStateBump,
      freeTradeStateBump: Number(freeTradeBump),
      programAsSignerBump: programAsSignerBump,
      buyerPrice: new anchor.BN(sellPrice),
      tokenSize: new anchor.BN(1),
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

    // generate instruction
    const instruction = createSellInstruction(
      sellInstructionAccounts,
      sellInstructionArgs
    )

    // add instruction to tx
    txt.add(instruction)

    // lookup recent block hash and assign fee payer (the current logged in user)
    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    // sign it
    const signed = await signTransaction(txt)

    // submit transaction
    const signature = await connection.sendRawTransaction(signed.serialize())
    await connection.confirmTransaction(signature, 'processed')
  }

  return (
    <form
      className='text-left'
      onSubmit={e => {
        e.preventDefault()
        sellNftTransaction();
      }}
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
                <input
                  autoFocus
                  value={value}
                  onChange={(e: any) => {
                    setSellAmount(e.target.value)
                    onChange(e.target.value)
                  }}
                  className='w-full h-10 pl-8 mb-4 bg-transparent border-2 border-gray-500 rounded-md focus:outline-none'
                />
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
