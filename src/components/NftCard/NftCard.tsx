import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { equals, find, not, pipe, prop, when, isNil, always } from 'ramda'
import React from 'react'
import { Link } from 'react-router-dom'
import { addressAvatar } from 'src/modules/address'
import { toSOL } from './../../modules/lamports'
import { Listing, Marketplace, Nft } from './../../types'
import { CrossmintPayButton } from '@crossmint/client-sdk-react-ui'

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
      <div className="relative block">
        <img
          alt="Placeholder"
          className="object-cover w-full aspect-square"
          src={nft.image as string}
        />
        {nft.offers.length > 0 && (
          <div className="absolute px-2 py-1 text-xs bg-black rounded-full top-3 left-3 bg-opacity-60">
            {nft.offers.length} {nft.offers.length == 1 ? 'Offer' : 'Offers'}
          </div>
        )}
      </div>
      <header className="p-4">
        <h4 className="mb-2 text-sm truncate lg:text-base">{nft.name}</h4>
        <div className="flex items-center gap-1">
          <div className="flex items-center ml-1.5">
            {nft.creators.map((creator) => {
              return (
                <div
                  className="flex items-center gap-1 -ml-1.5 z-10"
                  key={creator.address}
                >
                  <img
                    alt={creator.profile?.handle}
                    className="object-cover w-5 h-5 border-2 border-gray-900 rounded-full "
                    src={
                      when(
                        isNil,
                        always(addressAvatar(new PublicKey(creator.address)))
                      )(creator.profile?.profileImageUrl) as string
                    }
                  />
                </div>
              )
            })}
          </div>
          {nft.creators?.length === 1 && (
            <div className="text-xs font-medium text-gray-300 ">Creator</div>
          )}
        </div>
      </header>
      <footer className="flex items-center justify-end h-20 gap-2 px-4 border-t-2 border-t-gray-800">
        {listing ? (
          <>
            <div className="flex-1 mr-auto">
              <p className="label">Price</p>
              <p className="font-semibold icon-sol">
                {toSOL(listing.price.toNumber())}
              </p>
            </div>
            {not(isOwner) && (
              <>
                <Link to={`/nfts/${nft.address}`}>
                  <button className="button small grow-0">Buy Now</button>
                </Link>
                <CrossmintPayButton
                  collectionTitle={marketplace.name} // e.g. "Degods #1234"
                  collectionDescription={marketplace.description} // e.g. "A collection of degenerates, punks, and misfits. Gods of the metaverse & masters of our own universe. DeGods can be converted to DeadGods with DUST."
                  collectionPhoto={nft.image} // e.g. "https://i.imgur.com/fO3tI1t.png"
                  clientId="fec98fec-8281-4c5e-9348-4905ae1d150f"
                  mintArgs={{
                    mintHash: nft.mintAddress,
                    sellerWallet: nft.owner.address,
                    buyPrice: listing.price.toNumber(),
                  }}
                />
              </>
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
    <article className="overflow-hidden transition duration-100 transform bg-gray-900 rounded-lg cursor-pointer shadow-card">
      <div className="w-full bg-gray-800 aspect-square"></div>
      <header className="w-full p-4">
        <div className="h-12 bg-gray-800"></div>
      </header>
      <footer className="flex items-center justify-end h-20 gap-2 px-4 border-t-gray-800">
        <div className="w-24 bg-gray-800 button small grow-0"></div>
      </footer>
    </article>
  )
}

NftCard.Skeleton = Skeleton
