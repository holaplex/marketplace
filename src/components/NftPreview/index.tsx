import { Nft } from '@holaplex/marketplace-js-sdk'
import { PublicKey } from '@solana/web3.js'
import { always, isNil, when } from 'ramda'
import { addressAvatar } from 'src/modules/address'

interface NftPreviewProps {
  nft: Nft
}

export const NftPreview = ({ nft }: NftPreviewProps) => {
  return (
    <>
      <div className="relative aspect-square h-14 w-14">
        {nft?.image && (
          <img
            src={nft.image}
            alt="nft-mini-image"
            className="block w-full h-auto border-none rounded-lg shadow"
          />
        )}
      </div>
      <div className="flex-col ml-4">
        <span>{nft.name}</span>
        <div className="flex ml-1.5">
          {nft.creators.map((creator) => (
            <div key={creator.address} className="-ml-1.5">
              <a
                href={`https://holaplex.com/profiles/${creator.address}`}
                rel="noreferrer"
                target="_blank"
              >
                <img
                  className="rounded-full h-6 w-6 object-cover border-2 border-gray-900 transition-transform hover:scale-[1.5]"
                  src={
                    when(
                      isNil,
                      always(addressAvatar(new PublicKey(creator.address)))
                    )(creator.profile?.profileImageUrlLowres) as string
                  }
                />
              </a>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
