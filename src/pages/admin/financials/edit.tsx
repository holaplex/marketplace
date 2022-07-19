import { ReactElement, useEffect, useMemo, useState } from 'react'
import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import { isNil, not, pipe } from 'ramda'
import { isSol } from 'src/modules/sol'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AppProps } from 'next/app'
import client from './../../../client'
import { Marketplace } from '@holaplex/marketplace-js-sdk'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import AdminMenu, { AdminMenuItemType } from '../../../components/AdminMenu'
import { AdminLayout } from '../../../layouts/Admin'
import { Connection, Wallet } from '@metaplex/js'
import { AuctionHouse } from '@holaplex/marketplace-js-sdk/dist/types'
import { PublicKey } from '@solana/web3.js'
import { useTokenList } from 'src/hooks/tokenList'
import Price from 'src/components/Price'
import { EmptyTreasuryWalletForm } from './../../../components/EmptyTreasuryWalletForm'

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
          auctionHouses {
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

const getTreasuryBalance = async (ah: AuctionHouse, connection: Connection) => {
  const auctionHouseTreasury = new PublicKey(ah.auctionHouseTreasury)
  const auctionHouseTreasuryBalance = await connection.getBalance(
    auctionHouseTreasury
  )
  return auctionHouseTreasuryBalance
}

const AdminEditFinancials = ({ marketplace }: AdminEditFinancialsProps) => {
  const { connection } = useConnection()
  const [tokenMap, loadingTokens] = useTokenList()

  const tokens = marketplace.auctionHouses?.map(({ treasuryMint }) =>
    tokenMap.get(treasuryMint)
  )

  const [treasuryBalances, setTreasuryBalances] = useState(new Map())
  useEffect(() => {
    if (!marketplace.auctionHouses) return

    const promises = marketplace.auctionHouses.map(async (ah) => {
      const balance = await getTreasuryBalance(ah, connection)
      return { [ah.treasuryMint]: balance }
    })

    const map = new Map()
    Promise.all(promises).then((balances) => {
      balances.forEach((b) => {
        Object.entries(b).forEach(([k, v]) => {
          map.set(k, v)
        })
      })
      setTreasuryBalances(map)
    })
  }, [connection, marketplace.auctionHouses])

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
              <div className="flex-col mb-10 md:mb-0">
                <div className="w-full mb-4">
                  <h2>Transaction fees collected</h2>
                </div>
                <div className="grid grid-cols-12 gap-4">
                  {tokens?.map((token) => {
                    if (pipe(isSol, not)(token?.address || '')) {
                      return <div />
                    }

                    return (
                      <div
                        className="col-span-12 flex justify-between"
                        key={token?.address}
                      >
                        <div>
                          <span className="text-gray-300 uppercase font-semibold text-xs">
                            {token?.symbol} Unredeemed
                          </span>
                          <Price
                            price={treasuryBalances.get(token?.address) || 0}
                            token={token}
                            style="text-lg font-semibold"
                          />
                        </div>
                        <EmptyTreasuryWalletForm
                          token={token}
                          marketplace={marketplace}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AdminFinancialsLayoutProps {
  marketplace: Marketplace
  children: ReactElement
}

AdminEditFinancials.getLayout = function GetLayout({
  marketplace,
  children,
}: AdminFinancialsLayoutProps): ReactElement {
  return <AdminLayout marketplace={marketplace}>{children}</AdminLayout>
}

export default AdminEditFinancials
