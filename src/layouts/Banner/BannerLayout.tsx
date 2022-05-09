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
        <div className="absolute flex justify-end right-6 top-[28px]">
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
