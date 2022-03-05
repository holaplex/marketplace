import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house';
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata';
import { Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Nft, Marketplace } from '../../types'

interface OfferForm {
  amount: string;
}

interface OfferProps {
  nft: Nft;
  marketplace: Marketplace;
}

const Offer = ({ nft, marketplace }: OfferProps) => {
  const { handleSubmit } = useForm<OfferForm>({});
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const placeOfferTransaction = async ({ amount }: OfferForm) => {
    const buyerPrice = Number(amount) * LAMPORTS_PER_SOL;
    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(marketplace.auctionHouse.auctionHouseFeeAccount);
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint);
    const tokenMint = new PublicKey(nft.mintAddress);
    const [associatedTokenAccount] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(tokenMint, new PublicKey(nft.owner.address));

    if (!publicKey || !signTransaction) {
      return;
    }

    const [escrowPaymentAccount, escrowPaymentBump] = await AuctionHouseProgram.findEscrowPaymentAccountAddress(auctionHouse, publicKey);

    const [buyerTradeState, tradeStateBump] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      associatedTokenAccount,
      treasuryMint,
      tokenMint,
      buyerPrice,
      1,
    );

    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const txt = new Transaction();

    const instruction = AuctionHouseProgram.instructions.createBuyInstruction(
      {
        wallet: publicKey,
        paymentAccount: publicKey,
        transferAuthority: publicKey,
        treasuryMint,
        tokenAccount: associatedTokenAccount,
        metadata,
        escrowPaymentAccount,
        authority,
        auctionHouse,
        auctionHouseFeeAccount,
        buyerTradeState
      },
      {
        escrowPaymentBump,
        tradeStateBump,
        tokenSize: 1,
        buyerPrice,
      }
    );

    txt.add(instruction);

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    txt.feePayer = publicKey;

    const signed = await signTransaction(txt);

    const signature = await connection.sendRawTransaction(signed.serialize());

    await connection.confirmTransaction(signature, 'processed');
  }

  return (
    <form
      className="text-left grow"
      onSubmit={handleSubmit(placeOfferTransaction)}
    >
      <h3 className="mb-6 text-xl font-bold md:text-2xl">Make an offer</h3>
      <div className="mb-4 sol-input-wrapper">
        <input
          autoFocus
          className="input"
          placeholder="Price in SOL"
          onChange={(e) => {
            setOfferPrice(Number(e.target.value));
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link to={`/nfts/${nft.address}`} className='button secondary'>Cancel</Link>
        <button className="button">Place offer</button>
      </div>
    </form>
  )
};

export default Offer;