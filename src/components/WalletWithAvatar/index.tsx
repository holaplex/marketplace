interface Props {
  walletAddress: string
  avatarUrl: string
}

const WalletWithAvatar = ({ walletAddress, avatarUrl }: Props) => (
  <div className="flex items-center">
    <img src={avatarUrl} alt="label" className="h-5 rounded-full mr-2" />
    <div>{walletAddress.slice(0,4) + "..." + walletAddress.slice(-4) }</div>
  </div>
)

export default WalletWithAvatar