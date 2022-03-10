import React from 'react';
import { find, pipe, prop, equals } from 'ramda';
import { Nft, Marketplace, Listing } from './../../types';
import { Link } from 'react-router-dom';
import { toSOL } from './../../modules/lamports';

interface NftCardProps {
  nft: Nft;
  marketplace: Marketplace;
}

export const NftCard = ({ nft, marketplace }: NftCardProps) => {
  const listing = find<Listing>(
    pipe(
      prop('auctionHouse'),
      equals(marketplace.auctionHouse.address)
    )
  )(nft.listings);

  return (
    <article className='overflow-hidden rounded-lg transition duration-100 transform cursor-pointer bg-gray-900 shadow-card	hover:scale-[1.02]'>
      <img
        alt='Placeholder'
        className='block w-full aspect-square object-cover'
        src={nft.image as string}
      />
      <header className='p-4'>
        <h4 className='lg:text-base mb-2 text-sm truncate ...'>
          {nft.name}
        </h4>
        <div className='flex items-center'>
        </div>
      </header>
      <footer className='flex justify-end items-center h-20 gap-2 px-4 border-t-gray-800 border-t-2'>
        {listing ? (
          <>
            <div className='flex-1 mr-auto'>
              <p className='label'>Price</p>
              <p className='font-semibold icon-sol'>{toSOL(listing.price)}</p>
            </div>
            <Link to={`/nfts/${nft.address}`}>
              <button className='button small grow-0'>Buy Now</button>
            </Link>
          </>
        ) : (
          <Link to={`/nfts/${nft.address}/offers/new`}>
            <button className='button tertiary small grow-0'>Make Offer</button>
          </Link>
        )}
      </footer>
    </article>
  )
}

const Skeleton = () => {
  return (
    <article className='overflow-hidden rounded-lg transition duration-100 transform cursor-pointer bg-gray-900 shadow-card'>
      <div className="aspect-square w-full bg-gray-800"></div>
      <header className='p-4 w-full'>
        <div className="bg-gray-800 h-12"></div>
      </header>
      <footer className='flex items-center h-20 gap-2 px-4 justify-end border-t-gray-800'>
        <div className='button small grow-0 w-24 bg-gray-800'></div>
      </footer>
    </article>
  )
};

NftCard.Skeleton = Skeleton;
