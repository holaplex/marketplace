import { gql, useQuery } from '@apollo/client'
import { NextPage, NextPageContext } from 'next'
import { AppProps } from 'next/app'
import Head from 'next/head'
import { always, and, equals, ifElse, isNil, length, not, pipe } from 'ramda'
import { useWallet } from '@solana/wallet-adapter-react'
import { Link } from 'react-router-dom'
import { DollarSign, Tag } from 'react-feather'
import client from '../../client'
import { toSOL } from '../../modules/lamports'
import {
  Activity,
  Creator,
  Marketplace,
  MintStats,
  PriceChart,
} from '../../types'
import { format } from 'timeago.js'
import WalletPortal from '../../components/WalletPortal'
import Chart from '../../components/Chart'
import { subDays } from 'date-fns'
import ActivityWallets from '../../components/ActivityWallets'
import { truncateAddress } from 'src/modules/address'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

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

const GET_CREATOR_INFO = gql`
  query GetCreatorInfo($creator: String!, $auctionHouses: [PublicKey!]!) {
    creator(address: $creator) {
      address
      stats(auctionHouses: $auctionHouses) {
        auctionHouse
        volume24hr
        average
        floor
      }
    }
  }
`

const GET_PRICE_CHART_DATA = gql`
  query GetPriceChartData(
    $auctionHouses: [PublicKey!]!
    $creators: [PublicKey!]!
    $startDate: DateTimeUtc!
    $endDate: DateTimeUtc!
  ) {
    charts(
      auctionHouses: $auctionHouses
      creators: $creators
      startDate: $startDate
      endDate: $endDate
    ) {
      listingFloor {
        price
        date
      }
      salesAverage {
        price
        date
      }
      totalVolume {
        price
        date
      }
    }
  }
`

const GET_ACTIVITIES = gql`
  query GetActivities($auctionHouses: [PublicKey!]!) {
    activities(auctionHouses: $auctionHouses) {
      address
      metadata
      auctionHouse
      price
      createdAt
      wallets
      activityType
      nft {
        name
        image
        address
      }
    }
  }
`

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'] || SUBDOMAIN
  const slug = query.slug
  let creators: string[] = []
  let isCreatorAnalytics = false
  if (slug) {
    if (slug.length != 2 && slug[0] !== 'creators') {
      return {
        redirect: {
          permanent: false,
          destination: '/404',
        },
      }
    } else {
      creators.push(slug[1])
      isCreatorAnalytics = true
    }
  }

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
          creators {
            creatorAddress
            storeConfigAddress
          }
          auctionHouse {
            authority
            address
          }
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

  if (!slug) {
    creators = marketplace.creators.map((creator) => creator.creatorAddress)
  }

  return {
    props: {
      marketplace,
      creators,
      isCreatorAnalytics,
    },
  }
}

interface GetMarketplaceInfo {
  marketplace: Marketplace
}

interface GetCreatorInfo {
  creator: Creator
}

interface GetMarketplace {
  marketplace: Marketplace | null
}

export interface GetPriceChartData {
  charts: PriceChart
}

interface GetActivities {
  activities: Activity[]
}

interface Props extends AppProps {
  marketplace: Marketplace
  creators: string[]
  isCreatorAnalytics: boolean
}

const startDate = subDays(new Date(), 6).toISOString()
const endDate = new Date().toISOString()

const Analytics: NextPage<Props> = ({
  marketplace,
  creators,
  isCreatorAnalytics,
}) => {
  const { publicKey } = useWallet()
  let stats: MintStats | undefined

  const marketplaceQuery = useQuery<GetMarketplaceInfo>(GET_MARKETPLACE_INFO, {
    variables: {
      subdomain: marketplace.subdomain,
    },
    skip: isCreatorAnalytics,
  })

  const creatorQuery = useQuery<GetCreatorInfo>(GET_CREATOR_INFO, {
    variables: {
      creator: creators[0],
      auctionHouses: [marketplace.auctionHouse.address],
    },
    skip: !isCreatorAnalytics,
  })

  if (isCreatorAnalytics) {
    stats = creatorQuery.data?.creator.stats[0]
  } else {
    stats = marketplaceQuery.data?.marketplace.auctionHouse.stats
  }

  const priceChartDataQuery = useQuery<GetPriceChartData>(
    GET_PRICE_CHART_DATA,
    {
      fetchPolicy: 'network-only',
      variables: {
        auctionHouses: [marketplace.auctionHouse.address],
        creators: creators,
        startDate: startDate, // '2022-04-19T21:46:28Z',
        endDate: endDate, //'2022-04-25T14:49:13.130Z',
      },
    }
  )

  const activitiesQuery = useQuery<GetActivities>(GET_ACTIVITIES, {
    variables: {
      auctionHouses: [marketplace.auctionHouse.address],
    },
  })

  let activities: Activity[] = activitiesQuery.data?.activities || []

  const loading =
    marketplaceQuery.loading ||
    creatorQuery.loading ||
    priceChartDataQuery.loading ||
    activitiesQuery.loading

  return (
    <div className="flex flex-col items-center text-white bg-gray-900 max-w-5xl mx-auto">
      <Head>
        <title>{`${marketplace.name} analytics`}</title>
        <link rel="icon" href={marketplace.logoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={marketplace.name} />
        <meta property="og:title" content={`${marketplace.name} analytics`} />
        <meta property="og:image" content={marketplace.bannerUrl} />
        <meta property="og:description" content={marketplace.description} />
      </Head>
      <div className="w-full sticky top-0 z-10 flex items-center justify-between p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
        <Link to="/">
          <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full align sm:px-4 sm:py-2 sm:h-14 hover:bg-gray-600 transition-transform hover:scale-[1.02]">
            <img
              className="object-cover w-12 h-12 rounded-full md:w-8 md:h-8 aspect-square"
              src={marketplace.logoUrl}
            />
            <div className="hidden sm:block">{marketplace.name}</div>
          </button>
        </Link>
        <div className="block">
          <div className="flex items-center justify-end">
            {equals(
              publicKey?.toBase58(),
              marketplace.auctionHouse.authority
            ) && (
              <Link
                to="/admin/marketplace/edit"
                className="mr-6 text-sm cursor-pointer hover:underline "
              >
                Admin Dashboard
              </Link>
            )}
            <WalletPortal />
          </div>
        </div>
      </div>
      <div className="w-full max-w-[1800px] px-8">
        <p className="mt-6 mb-2 max-w-prose">Activity and analytics for</p>
        {!isCreatorAnalytics ? (
          <h2>{marketplace.name}</h2>
        ) : (
          <p className="mb-4 text-3xl pubkey">
            {truncateAddress(creators[0] as string)}
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-12">
          <div className="flex flex-col">
            <span className="text-gray-300 uppercase font-semibold block w-full mb-2">
              Floor Price
            </span>
            {loading ? (
              <div className="block bg-gray-800 w-20 h-10 rounded" />
            ) : (
              <span className="sol-amount text-3xl font-bold">
                {toSOL((stats?.floor.toNumber() || 0) as number)}
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
                {toSOL((stats?.average.toNumber() || 0) as number)}
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
                {toSOL((stats?.volume24hr.toNumber() || 0) as number)}
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
                {toSOL((stats?.volumeTotal.toNumber() || 0) as number)}
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
                chartData={priceChartDataQuery.data?.charts.listingFloor}
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
                chartData={priceChartDataQuery.data?.charts.salesAverage}
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
                    return (
                      <article
                        key={a.address}
                        className="grid grid-cols-5 p-4 mb-4 border border-gray-700 rounded"
                      >
                        <div className="flex gap-2 items-center col-span-2">
                          <img
                            className="object-cover h-12 w-12 rounded-lg"
                            src={a.nft.image}
                          />
                          <div className="flex flex-col gap-1">
                            <Link
                              to={`/nfts/${a.nft.address}`}
                              className="font-medium hover:underline"
                            >
                              {a.nft.name}
                            </Link>
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
                        </div>
                        <ActivityWallets activity={a} />
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
    </div>
  )
}

export default Analytics
