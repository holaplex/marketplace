import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Link } from 'react-router-dom';

interface OfferForm {
  amount: string;
}

interface OfferProps {
  nft: any;
}

const SellNft = ({ nft }: OfferProps) => {
  const { control, watch } = useForm<OfferForm>({});

  return (
    <form
      className="text-left grow"
      onSubmit={(e) => {
        e.preventDefault();
      }
      }>
      <h3 className="text-xl md:text-2xl font-bold mb-6">Sell this Nft</h3>
      <div className="">
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => {
            const auctionHouseFeeBasisPoints = 200;
            const amount = Number(value || 0) * LAMPORTS_PER_SOL;

            const royalties = (amount * nft.sellerFeeBasisPoints) / 10000;

            const auctionHouseFee = (amount * auctionHouseFeeBasisPoints) / 10000;

            return (
              <>
                <div className='sol-input-wrapper mb-4'>
                  <input
                    autoFocus
                    value={value}
                    onChange={(e: any) => {
                      onChange(e.target.value);
                    }}
                    placeholder="Price in SOL"
                    className="input"
                  />
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{nft.sellerFeeBasisPoints / 100}% creator royalty</span>
                    <div className="flex justify-center gap-2">
                      <span className="icon-sol"></span>
                      <span>{royalties / LAMPORTS_PER_SOL}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{auctionHouseFeeBasisPoints / 100}% transaction fee</span>
                    <div className="flex justify-center gap-2">
                      <span className="icon-sol"></span>
                      <span>{auctionHouseFee / LAMPORTS_PER_SOL}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">You receive</span>
                    <div className="flex justify-center gap-2">
                      <span className="icon-sol"></span>
                      <span>{(amount - royalties - auctionHouseFee) / LAMPORTS_PER_SOL}</span>
                    </div>
                  </div>
                </div>
              </>
            )
          }}
        />
      </div>
      <div className="flex gap-4">
        <Link to={`/nfts/${nft.address}`} className='button secondary flex-1'>Cancel</Link>
        <button className="button flex-1">List for sale</button>
      </div>
    </form>
  )
};

export default SellNft;