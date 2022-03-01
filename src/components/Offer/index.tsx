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
      className="text-left grow"
      onSubmit={(e) => {
        e.preventDefault();
      }
      }>
      <h3 className="text-xl md:text-2xl font-bold mb-6">Make an offer</h3>
      <div className="sol-input-wrapper mb-4">
        <input 
          autoFocus 
          className="input" 
          placeholder="Price in SOL"
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