import React, { useState }  from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house';
import { MetadataProgram } from  '@metaplex-foundation/mpl-token-metadata';
import { Transaction, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Nft, Marketplace } from '../../types'

const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112")
interface OfferForm {
  amount: string;
}

interface OfferProps {
  nft: Nft;
  marketplace: Marketplace;
}

const Offer = ({ nft, marketplace }: OfferProps) => {
  const { control, watch } = useForm<OfferForm>({});
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [offerPrice, setOfferPrice] = useState(0);

  const placeOfferTransaction = async () => {
    const tokenSize = '1';
    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(marketplace.auctionHouse.auction_houseFeeAccount)
    const tokenMint = new PublicKey(nft.mintAddress);
    const associatedTokenAccount = (
      await AuctionHouseProgram.findAssociatedTokenAccountAddress(tokenMint, new PublicKey(nft.owner.address)) 
    )[0];

    if (!publicKey || !signTransaction) {
      return;
    }

    const [escrowPaymentAccount, escrowPaymentBump] = await AuctionHouseProgram.findEscrowPaymentAccountAddress(auctionHouse,publicKey);

    const [buyerTradeState, tradeStateBump] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      associatedTokenAccount,
      NATIVE_MINT,
      tokenMint,
      String(offerPrice),
      tokenSize,
    );

    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)
    
    // make transaction
    const txt = new Transaction();

    // generate sell instruction
    const instruction = AuctionHouseProgram.instructions.createBuyInstruction(
      {
        wallet: publicKey,
        paymentAccount: publicKey,
        transferAuthority: publicKey,
        treasuryMint: NATIVE_MINT,
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
        tokenSize: new BN(tokenSize),
        buyerPrice: new BN(offerPrice), 
      }
    );

    // assign instruction to transaction
    txt.add(instruction);

    // lookup recent block hash and assign fee payer (the current logged in user)
    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    txt.feePayer = publicKey;

    const signed = await signTransaction(txt);

    // submit transaction
    const signature = await connection.sendRawTransaction(signed.serialize());
    
    await connection.confirmTransaction(signature, 'processed');
  }

  return (
    <form
      className="text-left grow"
      onSubmit={(e) => {
        e.preventDefault();
        placeOfferTransaction();
      }
      }>
      <h3 className="mb-6 text-xl font-bold md:text-2xl">Make an offer</h3>
      <div className="mb-4 sol-input-wrapper">
        <input 
          autoFocus 
          className="input" 
          placeholder="Price in SOL"
          onChange={(e)=>{
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