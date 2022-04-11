import React from 'react'
import { find, pipe, prop, equals, not } from 'ramda'
import { Nft, Marketplace, Listing } from './../../types'
import { Link } from 'react-router-dom'
import { toSOL } from './../../modules/lamports'
import { useWallet } from '@solana/wallet-adapter-react'

interface NftCardProps {
  nft: Nft
  marketplace: Marketplace
}

export const NftCard = ({ nft, marketplace }: NftCardProps) => {
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
      <header className="p-4">
        <h4 className="text-sm lg:text-base mb-2 truncate">{nft.name}</h4>
        <div className="">
          {nft.creators?.length === 1 && (
            <Link
              to={`/creators/${nft.creators[0].address}`}
              className="flex items-center gap-1"
            >
              <img
                alt={nft.creators[0].profile.handle}
                className="rounded-full h-5 w-5 object-cover bg-gray-300"
                src={nft.creators[0].profile.profileImageUrl}
              />

              <div className="text-xs font-medium text-gray-300">Creator</div>
            </Link>
          )}
          {nft.creators?.length > 1 && (
            <div className="flex items-center ml-1.5">
              {nft.creators.map((creator) => {
                return (
                  <Link
                    to={`/creators/${creator.address}`}
                    className="flex items-center gap-1 -ml-1.5"
                    key={creator.address}
                  >
                    <img
                      alt={creator.profile?.handle}
                      className="rounded-full h-5 w-5 object-cover border-2 border-gray-900 bg-gray-300"
                      src={creator.profile?.profileImageUrl}
                    />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </header>
      <footer className="flex justify-end items-center gap-2 px-4 h-20 border-t-gray-800 border-t-2">
        {listing ? (
          <>
            <div className="flex-1 mr-auto">
              <p className="label">Price</p>
              <p className="font-semibold icon-sol">
                {toSOL(listing.price.toNumber())}
              </p>
            </div>
            {not(isOwner) && (
              <Link to={`/nfts/${nft.address}`}>
                <button className="button small grow-0">Buy Now</button>
              </Link>
            )}
          </>
        ) : (
          not(isOwner) && (
            <Link to={`/nfts/${nft.address}/offers/new`}>
              <button className="button tertiary small grow-0">
                Make Offer
              </button>
            </Link>
          )
        )}
      </footer>
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
