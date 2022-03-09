import { truncateAddress } from '../../modules/address'

interface CreatorProps {
  address: string
  userName?: string
  imageUrl?: string
  nftCount?: number
  showRemove: boolean
}

const Creator = ({
  address,
  userName,
  imageUrl,
  nftCount,
  showRemove,
}: CreatorProps) => (
  <div className="flex items-center justify-between">
    <div className="flex gap-3">
      {imageUrl && (
        <img src={imageUrl} alt={address} className="h-8 rounded-full mr-2" />
      )}
      <div className="flex flex-col text-sm">
        {truncateAddress(address)}
        {nftCount && (
          <span className="text-xs text-gray-300">{nftCount} NFTs</span>
        )}
      </div>
    </div>
    {showRemove && <button className="button small grow-0">Remove</button>}
  </div>
)

export default Creator
