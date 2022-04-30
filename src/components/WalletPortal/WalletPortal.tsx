import { isNil, not, or, and } from 'ramda'
import { useQuery, gql } from '@apollo/client'
import { useWallet } from '@solana/wallet-adapter-react'
import * as Popover from '@radix-ui/react-popover'
import Button, { ButtonSize, ButtonType } from '../Button'
import { toSOL } from '../../modules/lamports'
import { Viewer } from './../../types.d'
import { addressAvatar, truncateAddress } from '../../modules/address'
import { useLogin } from './../../hooks/login'

const GET_VIEWER = gql`
  query GetViewer {
    viewer @client {
      balance
    }
  }
`

interface GetViewerData {
  viewer: Viewer
}

const WalletPortal = () => {
  const login = useLogin()
  const { connected, publicKey, disconnect, connecting } = useWallet()
  const { loading, data } = useQuery<GetViewerData>(GET_VIEWER)

  const isLoading = loading || connecting

  const handleLabelClick = async () => {
    if (publicKey?.toBase58().length) {
      await navigator.clipboard.writeText(publicKey.toBase58())
      toast(
        <div className="flex items-center justify-between">
          <div className="flex items-center text-white">
            <Check color="#32D583" className="mr-2" />
            <div>Wallet address copied to clipboard.</div>
          </div>
        </div>
      )
    }
  }

  return or(connected, isLoading) ? (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full align px-4 py-2 h-14 hover:bg-gray-600">
          {not(isLoading) && (
            <p>{truncateAddress(publicKey?.toBase58() as string)}</p>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content className="bg-gray-800 rounded-lg p-5 mt-2 text-white">
        {/* <Popover.Arrow className="fill-gray-800" offset={18} /> */}
        <div className="flex items-center justify-between mb-6 pl-10 pr-10">
          {isLoading ? (
            <div className="inline-block h-6 w-20 bg-gray-700 rounded" />
          ) : (
            <div className="text-sm connected-status">Connected</div>
          )}
        </div>
        {isLoading ? (
          <div className="h-8 w-44 rounded-full bg-gray-700" />
        ) : (
          <Button
            className="focus:outline-none"
            size={ButtonSize.Small}
            type={ButtonType.Tertiary}
            block
            onClick={disconnect}
          >
            Disconnect
          </Button>
        )}
      </Popover.Content>
    </Popover.Root>
  ) : (
    <button
      onClick={login}
      className="hover:scale-105 flex items-center justify-between gap-2 bg-gray-800 rounded-full align px-4 py-2 h-14 hover:bg-gray-600"
    >
      Connect Wallet
    </button>
  )
}

export default WalletPortal
