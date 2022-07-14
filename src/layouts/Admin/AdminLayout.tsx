import Link from 'next/link'
import { ReactElement } from 'react'
import WalletPortal from '../../components/WalletPortal'
import { Marketplace } from '@holaplex/marketplace-js-sdk'

interface AdminLayoutProps {
  marketplace: Marketplace
  children: ReactElement
}

export const AdminLayout = ({ marketplace, children }: AdminLayoutProps) => {
  return (
    <div className="flex flex-col items-center text-white bg-gray-900">
      <div className="fixed top-0 z-10 flex items-center justify-between w-full p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
        <Link href="/">
          <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full sm:px-4 sm:py-2 sm:h-14 hover:bg-gray-600 transition duration-100 transform hover:scale-[1.02]">
            <img
              className="object-cover w-12 h-12 rounded-full md:w-8 md:h-8 aspect-square "
              src={marketplace.logoUrl}
            />
            <div className="hidden sm:block">{marketplace.name}</div>
          </button>
        </Link>
        <div className="flex items-center">
          <div className="mr-6 text-sm underline cursor-pointer">
            Admin Dashboard
          </div>
          <WalletPortal />
        </div>
      </div>
      {children}
    </div>
  )
}
