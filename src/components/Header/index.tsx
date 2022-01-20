import { Wallet } from '../../contexts/wallet'
import { DarkModeToggle } from '../DarkModeToggle'

export const Header = () => {
  return (
    <div className="flex items-center justify-between">
      <DarkModeToggle />
      <Wallet />
    </div>
  )
}
