import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { ifElse, always, isNil } from 'ramda'

export const useLogin = () => {
  const { wallet, connect } = useWallet()

  const { setVisible } = useWalletModal()

  const openModal = async () => {
    setVisible(true)

    return Promise.resolve()
  }

  const onConnect = ifElse(isNil, always(openModal), always(connect))(wallet)

  return onConnect
}
