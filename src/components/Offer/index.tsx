import React from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { NATIVE_MINT } from '@solana/spl-token';
import { AuctionHouseProgram } from '@holaplex/mpl-auction-house';
import BN from 'bn.js';

const { createBuyInstruction } = AuctionHouseProgram.instructions;

interface OfferForm {
  price: string;
}

interface Nft {
  name: string
  address: string
  description: string
  image: string
  sellerFeeBasisPoints: number
  mintAddress: string
}

interface OfferProps {
  nft: Nft;
}

const Offer = ({ nft }: OfferProps) => {
  const { register, handleSubmit, } = useForm<OfferForm>({});
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const onSubmit = async ({ price }: OfferForm) => {
    const buyerPrice = String(Number(price) * LAMPORTS_PER_SOL);

    // NOTE: always 1 for NFTs since they are spl token with count of 1
    const tokenSize = '1';
    // TODO: read auction house from indexer
    const auctionHouse = new PublicKey('BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR');
    // TODO: read authority from auction house record (auctionHouse.authority)
    const authority = new PublicKey('BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR');
    const auctionHouseFeeAccount = new PublicKey('BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR');
    // TODO: compute ata for owner with token_account and metadata.mint
    const tokenAccount = new PublicKey('BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR');
    const tokenMint = new PublicKey(nft.mintAddress);

    if (!publicKey || !signTransaction) {
      return;
    }

    const [escrowPaymentAccount, escrowPaymentBump] = await AuctionHouseProgram.findEscrowPaymentAccount(
      auctionHouse,
      publicKey,
    );

    const [buyerTradeState, tradeStateBump] = await AuctionHouseProgram.findTradeStateAccount(
      publicKey,
      auctionHouse,
      tokenAccount,
      NATIVE_MINT,
      tokenMint,
      buyerPrice,
      tokenSize,
    );

    // make transaction
    const txt = new Transaction();

    // generate sell instruction
    const instruction = createBuyInstruction(
      {
        wallet: publicKey,
        paymentAccount: publicKey,
        transferAuthority: publicKey,
        treasuryMint: NATIVE_MINT,
        // the address of the ata for the current owner of the nft seed [wallet_address, metadata.mint]
        tokenAccount: tokenAccount,
        metadata: new PublicKey(nft.address),
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
        buyerPrice: new BN(buyerPrice), 
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
      className="text-left"
      onSubmit={handleSubmit(onSubmit)}>
      <h3 className="text-xl md:text-2xl font-bold mb-6">Make an offer</h3>
      <label className="mb-1 block">Price in SOL</label>
      <div className="prefix-input prefix-icon-sol">
        <input autoFocus className="bg-transparent focus:outline-none mb-4 pl-8 border-gray-500 border-2 w-full h-10 rounded-md" {...register("price")} />
      </div>
      <div className="grid grid-cols-2 flex-grow gap-4">
        <Link to={`/nfts/${nft.address}`}>
          <button className="text-sm text-white w-full transition-colors duration-150 bg-black rounded-full h-12 lg:text-xl md:text-base focus:shadow-outline hover:bg-black">Cancel</button>
        </Link>
        <button type="submit" className="text-sm text-black transition-colors duration-150 bg-white rounded-full h-12 lg:text-xl md:text-base focus:shadow-outline hover:bg-white">Place offer</button>
      </div>
    </form>
  )
};

export default Offer;