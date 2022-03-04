import React from 'react';
import { Nft } from './../../types';

interface NftCardProps {
  nft: Nft;
}

export const NftCard = ({ nft }: NftCardProps) => {
  const listingType = 'buyNow';

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
      {listingType === 'buyNow' &&
        <footer className='flex items-center h-20 gap-2 px-4 border-t-gray-800 border-t-2'>
          <div className='flex-1 mr-auto'>
            <p className='label'>Price</p>
            <p className='font-semibold icon-sol'>12</p>
          </div>
          <div className='button small grow-0'>Buy Now</div>
        </footer>
      }
      {listingType === 'unlisted' &&
        <footer className='grid items-center h-20 px-4 border-t-gray-800 border-t-2'>
          <div>
            <p className='label'>Last Price</p>
            <p className='font-semibold text-gray-300 icon-sol'>12</p>
          </div>
        </footer>
      }
      {listingType === 'neverListed' &&
        <footer className='grid items-center h-20 px-4 border-t-gray-800 border-t-2'>
          <div>
            <p className='label'>Minted</p>
            <p className='text-sm label'>6 days ago</p>
          </div>
        </footer>
      }
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
