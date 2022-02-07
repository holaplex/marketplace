import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

interface OfferForm {
  amount: string;
}

interface OfferProps {
  nft: any;
}

const Offer = ({ nft }: OfferProps) => {
  const { control, watch } = useForm<OfferForm>({});

  return (
    <form
      className="text-left"
      onSubmit={(e) => {
        e.preventDefault();
      }
      }>
      <h3 className="text-xl md:text-2xl font-bold mb-6">Make an offer</h3>
      <label className="mb-1 block">Price in SOL</label>
      <div className="prefix-input prefix-icon-sol">
        <input autoFocus className="bg-transparent focus:outline-none mb-4 pl-8 border-gray-500 border-2 w-full h-10 rounded-md" />
      </div>
      <div className="grid grid-cols-2 flex-grow gap-4">
        <Link to={`/nfts/${nft.address}`}>
          <button className="text-sm text-white w-full transition-colors duration-150 bg-black rounded-full h-12 lg:text-xl md:text-base focus:shadow-outline hover:bg-black">Cancel</button>
        </Link>
        <button className="text-sm text-black transition-colors duration-150 bg-white rounded-full h-12 lg:text-xl md:text-base focus:shadow-outline hover:bg-white">Place offer</button>
      </div>
    </form>
  )
};

export default Offer;