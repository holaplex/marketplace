const solSymbol = '◎'

interface NftDetails {
  description: string
  image: string
}
interface Nft {
  name: string
  address: string
  uri: string
  creators: string[]
  image: string
  description: string
}

type Props = {
  address: string
  nft: Nft
}

export const NftCard = ({ address, nft }: Props) => (
  <div className="p-4 h-68 overflow-clip hover:bg-gray">
    {/* change this to a next/link */}
    <a href={'/nfts/' + address}>
      <img
        src={nft.image as string}
        alt='nft image'
        className='object-fill h-56 pb-2 rounded-lg'
      />
      <div className="grid grid-cols-2 gap-2">
          <div>
          <p>{nft.name}</p>
          </div> 
          <div className="">
            <p className="text-right">55 {solSymbol}</p>
            <p className="text-right">Buy Now</p>
          </div>
      </div>
    </a>
  </div>
)
