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
      className="text-left"
      onSubmit={(e) => {
        e.preventDefault();
      }
      }>
      <h3 className="text-xl md:text-2xl font-bold mb-6">Sell this Nft</h3>
      <label className="mb-1 block">Price in SOL</label>
      <div className="prefix-input prefix-icon-sol">
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
                <input
                  autoFocus
                  value={value}
                  onChange={(e: any) => {
                    onChange(e.target.value);
                  }}
                  className="bg-transparent focus:outline-none mb-4 pl-8 border-gray-500 border-2 w-full h-10 rounded-md"
                />
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
      <div className="grid grid-cols-2 flex-grow gap-4">
        <Link to={`/nfts/${nft.address}`}>
          <button className="text-sm text-white w-full transition-colors duration-150 bg-black rounded-full h-12 lg:text-xl md:text-base focus:shadow-outline hover:bg-black">Cancel</button>
        </Link>
        <button className="text-sm text-black transition-colors duration-150 bg-white rounded-full h-12 lg:text-xl md:text-base focus:shadow-outline hover:bg-white">List for sale</button>
      </div>
    </form>
  )
};

export default SellNft;