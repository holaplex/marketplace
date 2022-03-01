interface Props {
  walletAddress: string
  avatarUrl: string
}

const WalletWithAvatar = ({ walletAddress, avatarUrl }: Props) => (
  <div className="flex items-center">
    <img src={avatarUrl} alt="label" className="h-5 rounded-full mr-2" />
    <div>{walletAddress}</div>
  </div>
)

export default WalletWithAvatar