import { useState } from 'react'
import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import { isNil } from 'ramda'
import { Image as ImageIcon, DollarSign, User, Plus } from 'react-feather'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-toastify'
import { AppProps } from 'next/app'
import client from './../../../client'
import WalletPortal from './../../../../src/components/WalletPortal'
import { Link } from 'react-router-dom'
import Button, { ButtonSize, ButtonType } from '../../../components/Button'
import { Marketplace } from './../../../types.d'
import { useLogin } from '../../../hooks/login'

import { Transaction, PublicKey } from '@solana/web3.js'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

const { createWithdrawFromTreasuryInstruction } =
  AuctionHouseProgram.instructions
interface GetMarketplace {
  marketplace: Marketplace | null
}

interface Integration {
  name: string
  id: string
  icon: string
  description: string
}

const availiableIntegrations: Integration[] = [
  {
    name: 'Crossmint',
    id: 'crossmint',
    description: 'Buy NFTs with a credit card!',
    icon: '/images/logos/crossmint_logo.png',
  },
  {
    name: 'Sharky.fi',
    id: 'sharky',
    description: 'Borrow & Lend Against Your NFTs, Instantly!',
    icon: '/images/logos/sharky_logo.svg',
  },
  {
    name: 'Bridgesplit',
    id: 'bridgesplit',
    description:
      'Earn yield and get liquidity for non-fungible tokens via lending, indexes, fractionalization, derivatives and more',
    icon: '/images/logos/bridgesplit_logo.png',
  },
  {
    name: 'Dispatch',
    id: 'dispatch',
    description:
      'The Dispatch Protocol on Solana helps dapps communicate with their users in a fast, reliable and secure manner.',
    icon: '/images/logos/crossmint_logo.png',
  },
]

export async function getServerSideProps({ req }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain']

  const {
    data: { marketplace },
  } = await client.query<GetMarketplace>({
    fetchPolicy: 'no-cache',
    query: gql`
      query GetMarketplace($subdomain: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          description
          logoUrl
          bannerUrl
          ownerAddress
          creators {
            creatorAddress
            storeConfigAddress
          }
          auctionHouse {
            address
            treasuryMint
            auctionHouseTreasury
            treasuryWithdrawalDestination
            feeWithdrawalDestination
            authority
            creator
            auctionHouseFeeAccount
            bump
            treasuryBump
            feePayerBump
            sellerFeeBasisPoints
            requiresSignOff
            canChangeSalePrice
          }
        }
      }
    `,
    variables: {
      subdomain: subdomain || SUBDOMAIN,
    },
  })

  if (isNil(marketplace)) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      marketplace,
    },
  }
}

interface AdminEditIntegrationsProps extends AppProps {
  marketplace: Marketplace
}

const AdminEditIntegrations = ({ marketplace }: AdminEditIntegrationsProps) => {
  const wallet = useWallet()
  const { connection } = useConnection()
  const { publicKey, signTransaction } = wallet

  const login = useLogin()

  return (
    <div className="flex flex-col items-center text-white bg-gray-900">
      <div className="fixed top-0 z-10 flex items-center justify-between w-full p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
        <Link to="/">
          <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full align sm:px-4 sm:py-2 sm:h-14 hover:bg-gray-600 transition duration-100 transform hover:scale-[1.02]">
            <img
              className="w-12 h-12 rounded-full md:w-8 md:h-8 aspect-square"
              src={marketplace.logoUrl}
            />
            <div className="hidden sm:block">{marketplace.name}</div>
          </button>
        </Link>
        <div className="flex items-center gap-6">
          <div className="text-sm underline cursor-pointer">
            Admin Dashboard
          </div>
          <WalletPortal />
        </div>
      </div>
      <div className="relative w-full">
        <img
          src={marketplace.bannerUrl}
          alt={marketplace.name}
          className="object-cover w-full h-44 md:h-60 lg:h-80 xl:h-[20rem] 2xl:h-[28rem]"
        />
      </div>
      <div className="w-full max-w-[1800px] px-6 md:px-12">
        <div className="relative w-full mt-20 mb-1">
          <img
            src={marketplace.logoUrl}
            className="absolute object-cover w-16 h-16 border-4 border-gray-900 rounded-full -top-28 md:w-28 md:h-28 md:-top-32"
          />
        </div>
        <div className="flex flex-col md:flex-row">
          <div className="flex-col space-y-2 md:mr-10 md:w-80 sm:block">
            <div className="sticky top-0 max-h-screen py-4 overflow-auto">
              <ul className="flex flex-col flex-grow gap-2">
                <li className="block p-2 rounded">
                  <Link
                    className="flex flex-row items-center w-full"
                    to="/admin/marketplace/edit"
                  >
                    <ImageIcon color="white" className="mr-1" size="1rem" />{' '}
                    Marketplace
                  </Link>
                </li>
                <li className="flex flex-row items-center p-2 rounded">
                  <Link
                    className="flex flex-row items-center w-full"
                    to="/admin/creators/edit"
                  >
                    <User color="white" className="mr-1" size="1rem" /> Creators
                  </Link>
                </li>
                <li className="block p-2 rounded">
                  <Link
                    className="flex flex-row items-center w-full"
                    to="/admin/financials/edit"
                  >
                    <DollarSign color="white" className="mr-1" size="1rem" />{' '}
                    Financials
                  </Link>
                </li>
                <li className="block p-2 bg-gray-800 rounded">
                  <Link
                    className="flex flex-row items-center w-full"
                    to="/admin/integrations/edit"
                  >
                    <Plus color="white" className="mr-1" size="1rem" />{' '}
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center w-full pb-16 grow">
            <div className="w-full max-w-3xl">
              <div className="grid items-start grid-cols-12 mb-10 md:mb-0 md:flex-row md:justify-between">
                <div className="w-full mb-4 col-span-full md:col-span-6 lg:col-span-8">
                  <h2>Integrations</h2>
                  <p className="text-gray-300">
                    Manage the integrations of this marketplace.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 my-2">
                {availiableIntegrations.map((ai) => (
                  <div className="px-2 py-2 border border-white rounded-lg">
                    <input type="checkbox" />
                    <img src={ai.icon} width="32px" />
                    <p>{ai.name}</p>
                    <p>{ai.description}</p>
                  </div>
                ))}
              </div>
              <div>
                <Button type={ButtonType.Primary}>Save settings</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminEditIntegrations
