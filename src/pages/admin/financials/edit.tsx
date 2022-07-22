import { ReactElement, useEffect, useMemo, useState } from 'react'
import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import { isNil, pipe, zip, map, forEach, values } from 'ramda'
import { TokenInfo } from '@solana/spl-token-registry'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AppProps } from 'next/app'
import client from './../../../client'
import { initMarketplaceSDK, Marketplace } from '@holaplex/marketplace-js-sdk'
import AdminMenu, { AdminMenuItemType } from '../../../components/AdminMenu'
import { AdminLayout } from '../../../layouts/Admin'
import { Wallet } from '@metaplex/js'
import { AuctionHouse } from '@holaplex/marketplace-js-sdk/dist/types'
import { useTokenList } from 'src/hooks/tokenList'
import Price from 'src/components/Price'
import { EmptyTreasuryWalletForm } from './../../../components/EmptyTreasuryWalletForm'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

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

const AdminEditFinancials = ({ marketplace }: AdminEditFinancialsProps) => {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [loadingBalances, setLoadinBalances] = useState(true)
  const [tokenMap, loadingTokens] = useTokenList()
  const [balances, setBalances] = useState<{
    [auctionHouse: string]: [AuctionHouse, TokenInfo | undefined, number]
  }>({})
  const sdk = useMemo(
    () => initMarketplaceSDK(connection, wallet as Wallet),
    [connection, wallet]
  )

  useEffect(() => {
    if (!marketplace.auctionHouses || loadingTokens) {
      return
    }

    ;(async () => {
      const next = { ...balances }

      const amounts = await Promise.all(
        marketplace.auctionHouses.map((auctionHouse) => {
          return sdk.treasury(auctionHouse).balance()
        })
      )

      pipe(
        zip(marketplace.auctionHouses),
        forEach(([auctionHouse, balance]: [AuctionHouse, number]) => {
          next[auctionHouse.address] = [
            auctionHouse,
            tokenMap.get(auctionHouse.treasuryMint),
            balance,
          ]
        })
      )(amounts)

      setBalances(next)
      setLoadinBalances(false)
    })()
  }, [marketplace.auctionHouses, loadingTokens])

  const loading = loadingBalances || loadingTokens

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
                  {loading ? (
                    <>
                      <div className="bg-gray-800 h-14 w-full rounded-md col-span-12" />
                      <div className="bg-gray-800 h-14 w-full rounded-md col-span-12" />
                      <div className="bg-gray-800 h-14 w-full rounded-md col-span-12" />
                    </>
                  ) : (
                    pipe(
                      values,
                      map(
                        ([auctionHouse, token, amount]: [
                          AuctionHouse,
                          TokenInfo | undefined,
                          number
                        ]) => {
                          return (
                            <div
                              className="col-span-12 flex justify-between"
                              key={auctionHouse.treasuryMint}
                            >
                              <div>
                                <span className="text-gray-300 uppercase font-semibold text-xs">
                                  {token?.symbol} Unredeemed
                                </span>
                                <Price
                                  price={amount}
                                  token={token}
                                  style="text-lg font-semibold"
                                />
                              </div>
                              <EmptyTreasuryWalletForm
                                onEmpty={async () => {
                                  await sdk
                                    .transaction()
                                    .add(
                                      sdk
                                        .treasury(auctionHouse)
                                        .withdraw({ amount })
                                    )
                                    .send()

                                  const next = { ...balances }

                                  next[auctionHouse.address] = [
                                    auctionHouse,
                                    token,
                                    0,
                                  ]

                                  setBalances(next)
                                }}
                                token={token}
                              />
                            </div>
                          )
                        }
                      )
                    )(balances)
                  )}
                  {}
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
