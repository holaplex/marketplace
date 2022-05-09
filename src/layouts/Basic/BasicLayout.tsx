import React, { ReactElement } from 'react'
import { Marketplace } from '../../types'
import Link from 'next/link'
import { equals } from 'ramda'
import WalletPortal from '../../components/WalletPortal'
import { useWallet } from '@solana/wallet-adapter-react'

interface BasicLayoutProps {
  marketplace: Marketplace
  children: ReactElement | ReactElement[]
}

export const BasicLayout = ({ marketplace, children }: BasicLayoutProps) => {
  const { publicKey } = useWallet()

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
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
              <a className="text-sm cursor-pointer mr-6 hover:underline">
                Creators
              </a>
            </Link>
            {equals(
              publicKey?.toBase58(),
              marketplace.auctionHouse.authority
            ) && (
              <Link href="/admin/marketplace/edit" passHref>
                <a className="mr-6 text-sm cursor-pointer hover:underline ">
                  Admin Dashboard
                </a>
              </Link>
            )}
            <WalletPortal />
          </div>
        </div>
      </div>
      {children}
    </>
  )
}
