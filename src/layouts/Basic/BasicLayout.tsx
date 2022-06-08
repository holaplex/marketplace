import React, { ReactElement } from 'react'
import { Marketplace } from '@holaplex/marketplace-js-sdk'
import Link from 'next/link'
import { equals } from 'ramda'
import cx from 'classnames'
import WalletPortal from '../../components/WalletPortal'
import { useWallet } from '@solana/wallet-adapter-react'
import DialectNotificationsButton from '../../components/DialectNotificationsButton'

interface BasicLayoutProps {
  marketplace: Marketplace
  children: ReactElement | ReactElement[]
  active?: NavigationLink
}

export enum NavigationLink {
  Creators,
  Admin,
}

export const BasicLayout = ({
  marketplace,
  children,
  active,
}: BasicLayoutProps) => {
  const { publicKey } = useWallet()

  return (
    <div className="flex items-center  flex-col text-white bg-gray-900">
      <div className="sticky top-0 z-10 w-full flex items-center justify-between py-6 px-6 md:px-12 text-white bg-gray-900/80 backdrop-blur-md grow">
        <Link href="/" passHref>
          <a>
            <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full align sm:px-4 sm:py-2 sm:h-14 hover:bg-gray-600 transition-transform hover:scale-[1.02]">
              <img
                className="object-cover w-12 h-12 rounded-full md:w-8 md:h-8 aspect-square"
                src={marketplace.logoUrl}
              />
              <div className="hidden sm:block">{marketplace.name}</div>
            </button>
          </a>
        </Link>
        <div className="block">
          <div className="flex items-center justify-end">
            <Link href="/creators" passHref>
              <a
                className={cx('text-sm cursor-pointer mr-6 hover:underline', {
                  underline: active === NavigationLink.Creators,
                })}
              >
                Creators
              </a>
            </Link>
            {equals(
              publicKey?.toBase58(),
              marketplace.auctionHouses
                ? marketplace.auctionHouses[0].authority
                : null
            ) && (
              <Link href="/admin/marketplace/edit" passHref>
                <a
                  className={cx('mr-6 text-sm cursor-pointer hover:underline', {
                    underline: active === NavigationLink.Admin,
                  })}
                >
                  Admin Dashboard
                </a>
              </Link>
            )}
            <div className="mr-2">
              <DialectNotificationsButton />
            </div>
            <WalletPortal />
          </div>
        </div>
      </div>
      <div className="w-full max-w-[1800px] px-6 md:px-12">{children}</div>
    </div>
  )
}
