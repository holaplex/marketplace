import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { equals, find, not, pipe, prop, when, isNil, always } from 'ramda'
import React from 'react'
import { Link } from 'react-router-dom'
import { addressAvatar } from 'src/modules/address'
import { toSOL } from './../../modules/lamports'
import { Listing, Marketplace, Nft } from './../../types'

interface NftCardProps {
  nft: Nft
  marketplace: Marketplace
  moonrank?: number
  howrareis?: number
}

export const NftCard = ({
  nft,
  marketplace,
  moonrank,
  howrareis,
}: NftCardProps) => {
  const { publicKey } = useWallet()
  const listing = find<Listing>(
    pipe(prop('auctionHouse'), equals(marketplace.auctionHouse.address))
  )(nft.listings)

  const isOwner = equals(nft.owner?.address, publicKey?.toBase58())

  return (
    <article className="overflow-hidden rounded-lg transition duration-100 transform cursor-pointer bg-gray-900 shadow-card	hover:scale-[1.02]">
      <div className="block relative">
        <img
          alt="Placeholder"
          className="w-full aspect-square object-cover"
          src={nft.image as string}
        />
        {nft.offers.length > 0 && (
          <div className="absolute top-3 left-3 text-xs rounded-full py-1 px-2 bg-black bg-opacity-60">
            {nft.offers.length} {nft.offers.length == 1 ? 'Offer' : 'Offers'}
          </div>
        )}
      </div>
      <header className="p-4 flex flex-col justify-stretch items-center sm:justify-center">
        <h4 className="lg:text-base mb-2 text-sm truncate flex-row sm:flex-col">
          {nft.name}
        </h4>
        <div className="flex flex-nowrap flex-row justify-center items-center space-x-2 sm:space-x-1 text-gray-300">
          {moonrank && (
            <div
              className="flex items-center justify-end space-x-2 sm:space-x-1"
              onClick={(e) => {
                e.preventDefault()
                window.document.location = `https://moonrank.app/${nft.mintAddress}`
              }}
            >
              <span className="text-[#6ef600] mb-1 select-none font-extrabold">
                ⍜
              </span>
              <span className="text-sm">{moonrank}</span>
            </div>
          )}
          {howrareis && (
            <div
              className="flex items-center justify-end space-x-0"
              onClick={(e) => {
                e.preventDefault()
                window.document.location = `https://howrare.is/${nft.mintAddress}`
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                viewBox="0 0 44 44"
              >
                <g transform="translate(0 -3)">
                  <path
                    d="M30.611,28.053A6.852,6.852,0,0,0,33.694,25.3a7.762,7.762,0,0,0,1.059-4.013,7.3,7.3,0,0,0-2.117-5.382q-2.118-2.153-6.2-2.153h-4.86V11.52H15.841v2.233H12.48v5.259h3.361v4.92H12.48v5.013h3.361V36.48h5.737V28.945h3.387l3.989,7.535H35.52Zm-2.056-5.32a2.308,2.308,0,0,1-2.393,1.2H21.578v-4.92h4.8a2.074,2.074,0,0,1,2.178,1.153,2.611,2.611,0,0,1,0,2.568"
                    fill="#6ef600"
                  ></path>
                </g>
              </svg>
              <span className="text-sm">{howrareis}</span>
            </div>
          )}
        </div>

        <div className="flex items-center"></div>
      </header>
      {listing && listing.price.toNumber ? (
        <footer className="flex justify-center lg:justify-end items-center gap-2 px-4 h-12 sm:h-16 lg:h-20 border-t-gray-800 border-t-2">
          <div className="flex-grow sm:flex-1 mr-auto text-sm sm:text-base text-center lg:text-left">
            <p className="label hidden lg:block">Price</p>
            <p className="font-semibold inline lg:block">
              <span className="inline lg:hidden pr-2">Price</span>
              <span className="icon-sol">
                {toSOL(listing.price.toNumber())}
              </span>
            </p>
          </div>
          {not(isOwner) && (
            <Link to={`/nfts/${nft.address}`} className="hidden lg:block">
              <button className="button small grow-0">Buy Now</button>
            </Link>
          )}
        </footer>
      ) : (
        <footer className="flex justify-center items-center gap-2 px-4 h-20 border-t-gray-800 border-t-2">
          {not(isOwner) && (
            <Link to={`/nfts/${nft.address}/offers/new`}>
              <button className="button tertiary small grow-0 mx-auto">
                Make Offer
              </button>
            </Link>
          )}
        </footer>
      )}
    </article>
  )
}

const Skeleton = () => {
  return (
    <article className="overflow-hidden rounded-lg transition duration-100 transform cursor-pointer bg-gray-900 shadow-card">
      <div className="aspect-square w-full bg-gray-800"></div>
      <header className="p-4 w-full">
        <div className="bg-gray-800 h-12"></div>
      </header>
      <footer className="flex items-center h-20 gap-2 px-4 justify-end border-t-gray-800">
        <div className="button small grow-0 w-24 bg-gray-800"></div>
      </footer>
    </article>
  )
}

NftCard.Skeleton = Skeleton
