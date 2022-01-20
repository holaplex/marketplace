import { WalletConnect } from '../../components/WalletConnect'
import { DarkModeToggle } from '../DarkModeToggle'

type Props = {
  title: string
}

export const Header = ({ title }: Props) => {
  return (
    <div className="flex items-center justify-between py-6 px-8 overlay-1">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center justify-end gap-6">
        <DarkModeToggle />
        <WalletConnect />
      </div>
    </div>
  )
}
