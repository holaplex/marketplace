import { always, isNil, ifElse, not, or } from 'ramda';
import Image from 'next/image';
import { useQuery, gql } from '@apollo/client';
import { useWallet } from "@solana/wallet-adapter-react";
import * as Popover from '@radix-ui/react-popover';
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Button, { ButtonSize, ButtonType } from "../Button";
import { toSOL } from '../../modules/lamports';
import { Viewer } from './../../types.d';
import { truncateAddress } from '../../modules/address';

const GET_VIEWER = gql`
  query GetViewer {
    viewer @client {
      balance
    }
  }
`;

interface GetViewerData {
  viewer: Viewer;
}

const WalletPortal = () => {
  const { wallet, connect, connected, publicKey, disconnect, connecting } = useWallet();
  const { loading, data } = useQuery<GetViewerData>(GET_VIEWER);

  const { setVisible } = useWalletModal();

  const openModal = async () => {
    setVisible(true);

    return Promise.resolve();
  };

  const onConnect = ifElse(
    isNil,
    always(openModal),
    always(connect),
  )(wallet);

  const isLoading = loading || connecting || not(data?.viewer);

  return (
    or(connected, isLoading) ? (
      <Popover.Root>
        <Popover.Trigger>
          <div className="w-12 h-12 rounded-full bg-gray-800">
            {not(isLoading) && (
              <Image height="48px" width="48px" className="rounded-full" alt="profile image" src="/static/gradient-3.png" />
            )}
          </div>
        </Popover.Trigger>
        <Popover.Anchor />
        <Popover.Content className="bg-gray-800 p-4 text-white">
          <Popover.Arrow className="fill-gray-800" />
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 inline-block rounded-full bg-gray-700 mr-4">
              {not(isLoading) && (
                <Image height="64px" width="64px" className="rounded-full" alt="profile image" src="/static/gradient-3.png" />
              )}
            </div>
            {not(isLoading) && (
              <a target="_blank" rel="noreferrer" href={`https://holaplex.com/profiles/${publicKey?.toBase58()}`}>View Profile &gt;</a>
            )}
          </div>
          <div className="flex items-center justify-between mb-6">
            <div className="sol-amount text-xl flex items-center">
              {isLoading ? (
                <div className="inline-block h-6 w-14 bg-gray-700 rounded" />
              ) : (
                toSOL(data?.viewer.balance as number)
              )}
            </div>
            {isLoading ? (
              <div className="inline-block h-6 w-20 bg-gray-700 rounded" />
            ) : (
              <div className="text-sm connected-status">
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
      <Button
        onClick={onConnect}
        size={ButtonSize.Small}
      >
        Connect
      </Button>
    )
  );
}

export default WalletPortal;