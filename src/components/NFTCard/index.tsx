import React from 'react';
import Link from 'next/link'

interface NFTCardProps {
  nft: any;
}

const Offer = ({ nft }: NFTCardProps) => {

  // stubbed out for testing
  const listingType = 'buyNow'

  return (
    <Link passHref href={`/nfts/${nft.address}`} key={nft.address}>
      <a>
        <article className='overflow-hidden rounded-lg transition duration-100 transform cursor-pointer bg-gray-900 shadow-card	hover:scale-[1.02]'>
          <img
            alt='Placeholder'
            className='block w-full aspect-square'
            src={nft.image as string}
          />
          <header className='p-4'>
            <h4 className='lg:text-base mb-2 text-sm truncate ...'>
              {nft.name}
            </h4>
            <div className='flex items-center'>
              <img src={nft.image as string} className='h-4 w-4 rounded-full bg-gray-800 m-0 outline-none mr-1' />
              <label className='label truncate ...'>TODO: Creator Name and avatar</label>
            </div>
          </header>

          {listingType === 'auction' &&
            <footer className='grid grid-cols-2 gap-2 h-20 items-center px-4 bg-gray-800 rounded-t-none rounded-b-lg'>
              <div>
                <p className='label'>Current Bid</p>
                <p className='font-semibold icon-sol'>33</p>
              </div>
              <div className='text-right'>
                <p className='label'>Ends In</p>
                <p className='text-sm'>19h 48m 53s</p>
              </div>
            </footer>
          }
          {listingType === 'buyNow' &&
            <footer className='flex gap-2 h-20 items-center px-4'>
              <div className='flex-1 mr-auto'>
                <p className='label'>Price</p>
                <p className='font-semibold icon-sol'>12</p>
              </div>
              <div className='button small grow-0'>Buy Now</div>
            </footer>
          }
          {listingType === 'unlisted' &&
            <footer className='grid h-20 items-center px-4'>
              <div>
                <p className='label'>Last Price</p>
                <p className='font-semibold icon-sol text-gray-300'>12</p>
              </div>
            </footer>
          }
          {listingType === 'neverListed' &&
            <footer className='grid h-20 items-center px-4'>
              <div>
                <p className='label'>Minted</p>
                <p className='label text-sm'>6 days ago</p>
              </div>
            </footer>
          }
        </article>
      </a>
    </Link >
  )
};

export default Offer;