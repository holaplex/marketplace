import { ReactElement, useState } from 'react'
import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import { isNil } from 'ramda'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-toastify'
import { AppProps } from 'next/app'
import client from './../../../client'
import Button, { ButtonSize, ButtonType } from '../../../components/Button'
import { Marketplace } from './../../../types.d'
import { useLogin } from '../../../hooks/login'

import { Transaction, PublicKey } from '@solana/web3.js'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import AdminMenu, { AdminMenuItemType } from '../../../components/AdminMenu'
import { AdminLayout } from '../../../layouts/Admin'

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

    const withdrawFromTreasuryInstructionAccounts = {
      treasuryMint,
      authority,
      treasuryWithdrawalDestination,
      auctionHouseTreasury,
      auctionHouse,
    }
    const withdrawFromTreasuryInstructionArgs = {
      amount: auctionHouseTreasuryBalance,
    }

    const withdrawFromTreasuryInstruction =
      createWithdrawFromTreasuryInstruction(
        withdrawFromTreasuryInstructionAccounts,
        withdrawFromTreasuryInstructionArgs
      )

    const txt = new Transaction()

    txt.add(withdrawFromTreasuryInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction | undefined = undefined

    try {
      signed = await signTransaction(txt)
    } catch (e: any) {
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
    <div className="w-full">
      <div>
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
            className="absolute object-cover w-16 h-16 border-4 bg-gray-900 border-gray-900 rounded-full -top-28 md:w-28 md:h-28 md:-top-32"
          />
        </div>
        <div className="flex flex-col md:flex-row">
          <div className="flex-col space-y-2 md:mr-10 md:w-80 sm:block">
            <div className="sticky top-0 max-h-screen py-4 overflow-auto">
              <AdminMenu selectedItem={AdminMenuItemType.Financials} />
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
                    Claim Funds
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

AdminEditFinancials.getLayout = function GetLayout(
  page: ReactElement
): ReactElement {
  return <AdminLayout marketplace={page.props.marketplace}>{page}</AdminLayout>
}

export default AdminEditFinancials
