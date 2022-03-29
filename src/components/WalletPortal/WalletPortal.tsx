import { isNil, not, or } from 'ramda'
import { useQuery, gql } from '@apollo/client'
import { useWallet } from '@solana/wallet-adapter-react'
import * as Popover from '@radix-ui/react-popover'
import Button, { ButtonSize, ButtonType } from '../Button'
import { toSOL } from '../../modules/lamports'
import { Viewer } from './../../types.d'
import { truncateAddress } from '../../modules/address'
import { useLogin } from './../../hooks/login'
import { Check, ChevronRight } from 'react-feather'
import { toast } from 'react-toastify'

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
      await navigator.clipboard.writeText(publicKey.toBase58());
      toast(
        <div className="flex items-center justify-between">
          <div className="flex items-center text-white">
            <Check color="#32D583" className="mr-2" />
            <div>Wallet address copied to clipboard.</div>
          </div>
        </div>
      );
    }
  };

  return or(connected, isLoading) ? (
    <Popover.Root>
      <Popover.Trigger asChild>
        <div className="block w-12 h-12 rounded-full bg-gray-800">
          {not(isLoading) && <div className="user-avatar h-[48px] w-[48px]" />}
        </div>
      </Popover.Trigger>
      <Popover.Content className="bg-gray-800 p-4 text-white">
        <Popover.Arrow className="fill-gray-800" offset={18} />
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 inline-block rounded-full bg-gray-700 mr-14">
            {not(isLoading) && (
              <div className="user-avatar w-full h-full block" />
            )}
          </div>
          {not(isLoading) && (
            <a
              target="_blank"
              rel="noreferrer"
              href={`https://holaplex.com/profiles/${publicKey?.toBase58()}`}
              className="flex items-center text-[#f4f4f4]  transition-colors hover:text-gray-300"
            >
              View Profile <ChevronRight size="18" className="ml-2"/>
            </a>
          )}
        </div>
        <div className="flex items-center justify-between mb-6">
          <div className="text-lg font-semibold flex items-center">
            {or(isLoading, isNil(data?.viewer)) ? (
              <div className="inline-block h-6 w-14 bg-gray-700 rounded" />
            ) : (
              toSOL(data?.viewer.balance as number) + ' SOL'
            )}
          </div>
          {isLoading ? (
            <div className="inline-block h-6 w-20 bg-gray-700 rounded" />
          ) : (
            <div className="text-xs connected-status text-gray-300 cursor-pointer" onClick={handleLabelClick}>
              {truncateAddress(publicKey?.toBase58() as string)}
            </div>
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
    <Button onClick={login} size={ButtonSize.Small}>
      Connect
    </Button>
  )
}

export default WalletPortal
