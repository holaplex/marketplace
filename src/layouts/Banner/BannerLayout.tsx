import React, { ReactElement } from 'react'
import { equals } from 'ramda'
import cx from 'classnames'
import { useWallet } from '@solana/wallet-adapter-react'
import { Marketplace } from '../../types'
import { useSidebar } from '../../hooks/sidebar'
import Link from 'next/link'
import WalletPortal from '../../components/WalletPortal'

interface BannerLayoutProps {
  marketplace: Marketplace
  children: ReactElement
}

export const BannerLayout = ({ marketplace, children }: BannerLayoutProps) => {
  const { publicKey } = useWallet()
  const { sidebarOpen } = useSidebar()

  return (
    <div
      className={cx('flex flex-col items-center text-white bg-gray-900', {
        'overflow-hidden': sidebarOpen,
      })}
    >
      <div className="relative w-full">
        <div className="absolute flex justify-between top-0 left-0 right-0 py-6 px-6 md:px-12">
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
          <div className="flex items-center justify-end">
            {equals(
              publicKey?.toBase58(),
              marketplace.auctionHouse.authority
            ) && (
              <Link href="/admin/marketplace/edit" passHref>
                <a className="text-sm cursor-pointer mr-6 hover:underline ">
                  Admin Dashboard
                </a>
              </Link>
            )}
            <Link href="/creators" passHref>
              <a className="text-sm cursor-pointer mr-6 hover:underline">
                Creators
              </a>
            </Link>
            <WalletPortal />
          </div>
        </div>
        <img
          src={marketplace.bannerUrl}
          alt={marketplace.name}
          className="object-cover w-full h-44 md:h-60 lg:h-80 xl:h-[20rem] 2xl:h-[28rem]"
        />
      </div>
      <div className="w-full max-w-[1800px] px-6 md:px-12">{children}</div>
    </div>
  )
}
