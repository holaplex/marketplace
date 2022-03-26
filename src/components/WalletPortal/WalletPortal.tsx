import { isNil, not, or } from 'ramda'
import { useQuery, gql } from '@apollo/client'
import { useWallet } from '@solana/wallet-adapter-react'
import * as Popover from '@radix-ui/react-popover'
import Button, { ButtonSize, ButtonType } from '../Button'
import { toSOL } from '../../modules/lamports'
import { Viewer } from './../../types.d'
import { truncateAddress } from '../../modules/address'
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

  return or(connected, isLoading) ? (
    <Popover.Root>
      <Popover.Trigger>
        <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full align px-4 py-2 h-14 hover:bg-gray-600">
          {not(isLoading) && (
            <p>{truncateAddress(publicKey?.toBase58() as string)}</p>
          )}
        </button>
        <Popover.Anchor />
      </Popover.Trigger>
      <Popover.Content className="bg-gray-800 p-4 text-white">
        <Popover.Arrow className="fill-gray-800" />
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
    <Button type={ButtonType.Secondary} onClick={login} size={ButtonSize.Large}>
      Connect Wallet
    </Button>
  )
}

export default WalletPortal
