import { gql, useQuery } from '@apollo/client'
import { NextPage, NextPageContext } from 'next'
import { AppProps } from 'next/app'
import Head from 'next/head'
import {
  always,
  and,
  equals,
  gt,
  ifElse,
  isNil,
  length,
  not,
  partialRight,
  pipe,
} from 'ramda'
import { DollarSign, Tag } from 'react-feather'
import client from 'src/client'
import { truncateAddress } from 'src/modules/address'
import { toSOL } from 'src/modules/lamports'
import { Activity, Marketplace } from 'src/types'
import { format } from 'timeago.js'
import cx from 'classnames'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

const moreThanOne = pipe(length, partialRight(gt, [1]))

const GET_MARKETPLACE_INFO = gql`
  query GetMarketplaceInfo($subdomain: String!) {
    marketplace(subdomain: $subdomain) {
      subdomain
      ownerAddress
      stats {
        nfts
      }
      auctionHouse {
        address
        stats {
          mint
          floor
          average
          volume24hr
        }
      }
    }
  }
`

export async function getServerSideProps({ req }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'] || SUBDOMAIN

  const response = await client.query<GetMarketplace>({
    fetchPolicy: 'no-cache',
    query: gql`
      query GetMarketplacePage($subdomain: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          description
          logoUrl
          bannerUrl
        }
      }
    `,
    variables: {
      subdomain,
    },
  })

  const {
    data: { marketplace },
  } = response

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

interface GetMarketplaceInfo {
  marketplace: Marketplace
}

interface GetMarketplace {
  marketplace: Marketplace | null
}

interface Props extends AppProps {
  marketplace: Marketplace
}

const Analytics: NextPage<Props> = ({ marketplace }) => {
  const marketplaceQuery = useQuery<GetMarketplaceInfo>(GET_MARKETPLACE_INFO, {
    variables: {
      subdomain: marketplace.subdomain,
    },
  })
  const loading = marketplaceQuery.loading

  let activities: Activity[] = []

  return (
    <div className="flex flex-col items-center text-white bg-gray-900">
      <Head>
        <title>{marketplace.name}</title>
        <link rel="icon" href={marketplace.logoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={marketplace.name} />
        <meta property="og:title" content={marketplace.name} />
        <meta property="og:image" content={marketplace.bannerUrl} />
        <meta property="og:description" content={marketplace.description} />
      </Head>
      <div className="w-full max-w-[1800px] px-8">
        <p className="mt-6 mb-2 max-w-prose">Activity and analytics for</p>
        <h2>{marketplace.name}</h2>
        <div>
          <div className="flex justify-between pt-14 pr-16">
            <div className="flex flex-col">
              <span className="text-gray-300 uppercase font-semibold text-sm block w-full mb-2">
                Floor Price
              </span>
              {loading ? (
                <div className="block bg-gray-800 w-20 h-6 rounded" />
              ) : (
                <span className="sol-amount text-3xl font-bold">
                  {toSOL(
                    (marketplaceQuery.data?.marketplace.auctionHouse.stats?.floor.toNumber() ||
                      0) as number
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-gray-300 uppercase font-semibold text-sm block w-full mb-2">
                Avg Price
              </span>
              {loading ? (
                <div className="block bg-gray-800 w-20 h-6 rounded" />
              ) : (
                <span className="sol-amount text-3xl font-bold">
                  {toSOL(
                    (marketplaceQuery.data?.marketplace.auctionHouse.stats?.average.toNumber() ||
                      0) as number
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-gray-300 uppercase font-semibold text-sm block w-full mb-2">
                Vol Last 24h
              </span>
              {loading ? (
                <div className="block bg-gray-800 w-20 h-6 rounded" />
              ) : (
                <span className="sol-amount text-3xl font-bold">
                  {toSOL(
                    (marketplaceQuery.data?.marketplace.auctionHouse.stats?.volume24hr.toNumber() ||
                      0) as number
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-gray-300 uppercase font-semibold text-sm block w-full mb-2">
                Vol All Time
              </span>
              {loading ? (
                <div className="block bg-gray-800 w-20 h-6 rounded" />
              ) : (
                <span className="sol-amount text-3xl font-bold">
                  {'__' + toSOL(0 as number)}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* <Chart /> */}
        <h2 className="mb-4 mt-14 text-xl md:text-2xl text-bold">Activity</h2>
        {ifElse(
          (activities: Activity[]) =>
            and(pipe(length, equals(0))(activities), not(loading)),
          always(
            <div className="w-full p-10 text-center border border-gray-800 rounded-lg">
              <h3>No activities found</h3>
              <p className="text-gray-500 mt-">
                There are currently no activities for this NFT.
              </p>
            </div>
          ),
          (activities: Activity[]) => (
            <section className="w-full">
              <header className="grid px-4 mb-2 grid-cols-4">
                <span className="label">EVENT</span>
                <span className="label">WALLETS</span>
                <span className="label">PRICE</span>
                <span className="label">WHEN</span>
              </header>
              {loading ? (
                <>
                  <article className="bg-gray-800 mb-4 h-16 rounded" />
                  <article className="bg-gray-800 mb-4 h-16 rounded" />
                  <article className="bg-gray-800 mb-4 h-16 rounded" />
                  <article className="bg-gray-800 mb-4 h-16 rounded" />
                </>
              ) : (
                activities.map((a: Activity) => {
                  const hasWallets = moreThanOne(a.wallets)

                  return (
                    <article
                      key={a.address}
                      className="grid grid-cols-4 p-4 mb-4 border border-gray-700 rounded"
                    >
                      <div className="flex self-center">
                        {a.activityType === 'purchase' ? (
                          <DollarSign
                            className="mr-2 self-center text-gray-300"
                            size="18"
                          />
                        ) : (
                          <Tag
                            className="mr-2 self-center text-gray-300"
                            size="18"
                          />
                        )}
                        <div>
                          {a.activityType === 'purchase' ? 'Sold' : 'Listed'}
                        </div>
                      </div>
                      <div
                        className={cx('flex items-center self-center ', {
                          '-ml-6': hasWallets,
                        })}
                      >
                        {hasWallets && (
                          <img
                            src="/images/uturn.svg"
                            className="mr-2 text-gray-300 w-4"
                            alt="wallets"
                          />
                        )}
                        <div className="flex flex-col">
                          <a
                            href={`https://holaplex.com/profiles/${a.wallets[0]}`}
                            rel="nofollower"
                            className="text-sm"
                          >
                            {truncateAddress(a.wallets[0])}
                          </a>
                          {hasWallets && (
                            <a
                              href={`https://holaplex.com/profiles/${a.wallets[1]}`}
                              rel="nofollower"
                              className="text-sm"
                            >
                              {truncateAddress(a.wallets[1])}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="self-center">
                        <span className="sol-amount">
                          {toSOL(a.price.toNumber())}
                        </span>
                      </div>
                      <div className="self-center text-sm">
                        {format(a.createdAt, 'en_US')}
                      </div>
                    </article>
                  )
                })
              )}
            </section>
          )
        )(activities)}
      </div>
    </div>
  )
}

export default Analytics
