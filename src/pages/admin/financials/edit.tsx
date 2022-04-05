import { useState } from 'react'
import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import { isNil } from 'ramda'
import { Image as ImageIcon, DollarSign, User } from 'react-feather'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-toastify'
import { AppProps } from 'next/app'
import client from './../../../client'
import WalletPortal from './../../../../src/components/WalletPortal'
import { Link } from 'react-router-dom'
import Button, { ButtonSize, ButtonType } from '../../../components/Button'
import { Marketplace } from './../../../types.d'
import { useLogin } from '../../../hooks/login'

import {
  Transaction,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

const { createWithdrawFromTreasuryInstruction } =
  AuctionHouseProgram.instructions
interface GetMarketplace {
  marketplace: Marketplace | null
}

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

interface AdminEditFinancialsProps extends AppProps {
  marketplace: Marketplace
}

const AdminEditFinancials = ({ marketplace }: AdminEditFinancialsProps) => {
  const wallet = useWallet()
  const { connection } = useConnection()
  const { publicKey, signTransaction } = wallet

  const login = useLogin()

  const [withdrawlLoading, setWithdrawlLoading] = useState(false)

  const payoutFunds = async () => {
    if (!publicKey || !signTransaction || !wallet) {
      toast.error('Wallet not connected')

      login()

      return
    }

    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint)
    const auctionHouseTreasury = new PublicKey(
      marketplace.auctionHouse.auctionHouseTreasury
    )

    const treasuryWithdrawalDestination = new PublicKey(
      marketplace.auctionHouse.treasuryWithdrawalDestination
    )

    const auctionHouseTreasuryBalance = await connection.getBalance(
      auctionHouseTreasury
    )
    debugger

    const withdrawFromTreasuryInstructionAccounts = {
      treasuryMint,
      authority,
      treasuryWithdrawalDestination,
      auctionHouseTreasury,
      auctionHouse,
    }
    const withdrawFromTreasuryInstructionArgs = {
      amount: auctionHouseTreasuryBalance / 2,
    }

    const withdrawFromTreasuryInstruction =
      createWithdrawFromTreasuryInstruction(
        withdrawFromTreasuryInstructionAccounts,
        withdrawFromTreasuryInstructionArgs
      )

    const holaplexCommunityWallet = new PublicKey(
      'ho1aVYd4TDWCi1pMqFvboPPc3J13e4LgWkWzGJpPJty'
    )

    const withdrawFromTreasuryToHolaInstruction =
      createWithdrawFromTreasuryInstruction(
        {
          treasuryMint,
          authority,
          treasuryWithdrawalDestination: holaplexCommunityWallet,
          auctionHouseTreasury,
          auctionHouse,
        },
        {
          amount: auctionHouseTreasuryBalance / 2,
        }
      )

    const txt = new Transaction()
    txt
      .add(withdrawFromTreasuryInstruction)
      .add(withdrawFromTreasuryToHolaInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction | undefined = undefined

    try {
      signed = await signTransaction(txt)
    } catch (e) {
      toast.error(e.message)
      return
    }

    let signature: string | undefined = undefined

    try {
      toast('Sending the transaction to Solana.')
      setWithdrawlLoading(true)
      signature = await connection.sendRawTransaction(signed.serialize())

      await connection.confirmTransaction(signature, 'confirmed')

      toast.success('The transaction was confirmed.')
    } catch (e) {
      toast.error(e.message)
    }
    setWithdrawlLoading(false)
  }

  return (
    <div className="flex flex-col items-center text-white bg-gray-900">
      <div className="fixed top-0 z-10 flex items-center justify-between w-full p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
        <Link to="/">
          <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full align sm:px-4 sm:py-2 sm:h-14 hover:bg-gray-600 transition-transform hover:scale-[1.02]">
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
      <div className="w-full max-w-[1800px] px-8">
        <div className="relative w-full mt-20 mb-1">
          <img
            src={marketplace.logoUrl}
            className="object-cover w-12 h-12 rounded-full md:w-8 md:h-8 aspect-square"
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
                <li className="block p-2 bg-gray-800 rounded">
                  <Link
                    className="flex flex-row items-center w-full"
                    to="/admin/financials/edit"
                  >
                    <DollarSign color="white" className="mr-1" size="1rem" />{' '}
                    Financials
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center w-full pb-16 grow">
            <div className="w-full max-w-3xl">
              <div className="grid items-start grid-cols-12 mb-10 md:mb-0 md:flex-row md:justify-between">
                <div className="w-full mb-4 col-span-full md:col-span-6 lg:col-span-8">
                  <h2>Financials</h2>
                  <p className="text-gray-300">
                    Manage the finances of this marketplace.
                  </p>
                </div>
                <div className="flex justify-end col-span-full md:col-span-6 lg:col-span-4">
                  <Button
                    block
                    onClick={payoutFunds}
                    type={ButtonType.Primary}
                    size={ButtonSize.Small}
                    loading={withdrawlLoading}
                  >
                    Disperse Funds
                  </Button>
                  &nbsp;&nbsp;
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminEditFinancials
