interface NftDetails {
  description: string
  image: string
}
interface Nft {
  name: string
  address: string
  uri: string
  creators: string[]
  details?: NftDetails
}

type Props = {
  address: string
  nft: Nft
}

export const NftCard = ({ address, nft }: Props) => (
  <div className="border border-gray rounded-lg p-4">
    <a href={'/nfts/' + address}>
      <img
        src={nft.details?.image as string}
        alt='nft image'
        className='aspect-square rounded-lg pb-2'
      />
      {nft.name}
    </a>
  </div>
)
