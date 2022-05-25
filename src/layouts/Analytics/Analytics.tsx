import React, { ReactElement } from 'react'
import { gql, useQuery, QueryResult, OperationVariables } from '@apollo/client'
import Head from 'next/head'
import { PublicKey } from '@solana/web3.js'
import {
  always,
  and,
  equals,
  gt,
  ifElse,
  isNil,
  length,
  not,
  pipe,
  when,
} from 'ramda'
import Link from 'next/link'
import { DollarSign, Tag } from 'react-feather'
import { truncateAddress, addressAvatar } from '../../modules/address'
import { toSOL } from '../../modules/lamports'
import { Activity, Marketplace } from '@holaplex/marketplace-js-sdk'
import { format } from 'timeago.js'
import cx from 'classnames'
import { BasicLayout } from '../Basic'
import Chart from './../../components/Chart'
import { GetActivities, GetPriceChartData } from 'src/types'

const moreThanOne = pipe(length, (len) => gt(len, 1))

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
          volumeTotal
        }
      }
    }
  }
`

interface GetMarketplaceInfo {
  marketplace: Marketplace
}

interface AnalyticsLayoutProps {
  marketplace: Marketplace
  creators?: string[]
  priceChartQuery: QueryResult<GetPriceChartData, OperationVariables>
  activitiesQuery: QueryResult<GetActivities, OperationVariables>
  title: ReactElement
  metaTitle: string
}

export const AnalyticsLayout = ({
  marketplace,
  priceChartQuery,
  activitiesQuery,
  title,
  metaTitle,
}: AnalyticsLayoutProps) => {
  const marketplaceQuery = useQuery<GetMarketplaceInfo>(GET_MARKETPLACE_INFO, {
    variables: {
      subdomain: marketplace.subdomain,
    },
  })

  let activities: Activity[] = activitiesQuery.data?.activities || []

  const loading =
    marketplaceQuery.loading ||
    priceChartQuery.loading ||
    activitiesQuery.loading

  return (
    <BasicLayout marketplace={marketplace}>
      <Head>
        <title>{metaTitle}</title>
        <link rel="icon" href={marketplace.logoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={marketplace.name} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:image" content={marketplace.bannerUrl} />
        <meta property="og:description" content={marketplace.description} />
      </Head>

      <p className="mt-6 mb-2 max-w-prose">Activity and analytics for</p>
      {title}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-12">
        <div className="flex flex-col">
          <span className="text-gray-300 uppercase font-semibold block w-full mb-2">
            Floor Price
          </span>
          {loading ? (
            <div className="block bg-gray-800 w-20 h-10 rounded" />
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
          <span className="text-gray-300 uppercase font-semibold block w-full mb-2">
            Avg Price
          </span>
          {loading ? (
            <div className="block bg-gray-800 w-20 h-10 rounded" />
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
          <span className="text-gray-300 uppercase font-semibold block w-full mb-2">
            Vol Last 24h
          </span>
          {loading ? (
            <div className="block bg-gray-800 w-20 h-10 rounded" />
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
          <span className="text-gray-300 uppercase font-semibold block w-full mb-2">
            Vol All Time
          </span>
          {loading ? (
            <div className="block bg-gray-800 w-20 h-10 rounded" />
          ) : (
            <span className="sol-amount text-3xl font-bold">
              {toSOL(
                (marketplaceQuery.data?.marketplace.auctionHouse.stats?.volumeTotal.toNumber() ||
                  0) as number
              )}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-12 my-20">
        <div className="flex flex-col w-full">
          <span className="uppercase text-gray-300 text-xs font-semibold mb-6">
            Floor Price LAST 7 DAYS
          </span>
          {loading ? (
            <div className="w-full h-[200px] bg-gray-800 rounded-md" />
          ) : (
            <Chart
              height={200}
              chartData={priceChartQuery.data?.charts.listingFloor}
            />
          )}
        </div>
        <div className="flex flex-col w-full">
          <span className="uppercase text-gray-300 text-xs font-semibold mb-6">
            Average Price LAST 7 DAYS
          </span>
          {loading ? (
            <div className="w-full h-[200px] bg-gray-800 rounded-md" />
          ) : (
            <Chart
              height={200}
              chartData={priceChartQuery.data?.charts.salesAverage}
            />
          )}
        </div>
      </div>
      <h2 className="mt-14 mb-12 text-xl md:text-2xl text-bold">Activity</h2>
      <div className="mb-10">
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
              <header className="grid px-4 mb-2 grid-cols-5">
                <span className="label col-span-2">EVENT</span>
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
                      className="grid grid-cols-5 p-4 mb-4 border border-gray-700 rounded"
                    >
                      <Link href={`/nfts/${a.nft.address}`} passHref>
                        <a className="flex gap-2 items-center col-span-2">
                          <img
                            className="object-cover h-12 w-12 rounded-lg"
                            src={a.nft.image}
                          />
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">{a.nft.name}</div>
                            <div className="flex">
                              {a.activityType === 'purchase' ? (
                                <DollarSign
                                  className="mr-2 self-center text-gray-300"
                                  size="16"
                                />
                              ) : (
                                <Tag
                                  className="mr-2 self-center text-gray-300"
                                  size="16"
                                />
                              )}
                              <div className="text-xs -ml-1">
                                {a.activityType === 'purchase'
                                  ? 'Sold'
                                  : 'Listed'}
                              </div>
                            </div>
                          </div>
                        </a>
                      </Link>
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
                            href={`https://holaplex.com/profiles/${a.wallets[0].address}`}
                            rel="nofollower"
                            className="text-sm flex items-center gap-1"
                          >
                            <img
                              className="rounded-full h-5 w-5 object-cover border-2 border-gray-900 "
                              src={
                                when(
                                  isNil,
                                  always(
                                    addressAvatar(
                                      new PublicKey(a.wallets[0].address)
                                    )
                                  )
                                )(
                                  a.wallets[0].profile?.profileImageUrl
                                ) as string
                              }
                            />
                            {a.wallets[0].profile?.handle
                              ? `@${a.wallets[0].profile?.handle}`
                              : truncateAddress(a.wallets[0].address)}
                          </a>
                          {hasWallets && (
                            <a
                              href={`https://holaplex.com/profiles/${a.wallets[1].address}`}
                              rel="nofollower"
                              className="text-sm flex items-center gap-1"
                            >
                              <img
                                className="rounded-full h-5 w-5 object-cover border-2 border-gray-900"
                                src={
                                  when(
                                    isNil,
                                    always(
                                      addressAvatar(
                                        new PublicKey(a.wallets[1].address)
                                      )
                                    )
                                  )(
                                    a.wallets[1].profile?.profileImageUrl
                                  ) as string
                                }
                              />
                              {a.wallets[1].profile?.handle
                                ? `@${a.wallets[1].profile?.handle}`
                                : truncateAddress(a.wallets[1].address)}
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
    </BasicLayout>
  )
}
