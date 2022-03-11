import { truncateAddress } from '../../modules/address'

export interface RemoveCreatorForm {
  walletAddress: string
}
interface CreatorProps {
  address: string
  userName?: string
  imageUrl?: string
  nftCount?: number
  showRemove: boolean
  onRemoveClicked?: (form: RemoveCreatorForm) => void
}

const Creator = ({
  address,
  userName,
  imageUrl,
  nftCount,
  showRemove,
  onRemoveClicked,
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
    {showRemove && (
      <button
        className="button small grow-0"
        onClick={() => onRemoveClicked!({ walletAddress: address })}
      >
        Remove
      </button>
    )}
  </div>
)

export default Creator
