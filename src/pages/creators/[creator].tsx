import { gql, useQuery, useLazyQuery } from '@apollo/client'
import { useWallet } from '@solana/wallet-adapter-react'
import cx from 'classnames'
import { subDays } from 'date-fns'
import { NextPage, NextPageContext } from 'next'
import { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import {
  always,
  any,
  equals,
  filter,
  ifElse,
  indexOf,
  isEmpty,
  isNil,
  length,
  map,
  modify,
  not,
  or,
  partial,
  pipe,
  prop,
  when,
} from 'ramda'
import React, { useEffect, useState, ReactElement } from 'react'
import { Filter } from 'react-feather'
import { Controller, useForm } from 'react-hook-form'
import Link from 'next/link'
import Select from 'react-select'
import { toSOL } from './../../modules/lamports'
import { BannerLayout } from './../../layouts/Banner'
import {
  GetNftCounts,
  GetWalletCounts,
  GET_NFT_COUNTS,
  GET_WALLET_COUNTS,
} from '..'
import client from '../../client'
import Button, { ButtonSize, ButtonType } from '../../components/Button'
import { List } from '../../components/List'
import { NftCard } from '../../components/NftCard'
import { useSidebar } from '../../hooks/sidebar'
import { truncateAddress } from '../../modules/address'
import Chart from './../../components/Chart'
import {
  AttributeFilter,
  Creator,
  Marketplace,
  Nft,
  PresetNftFilter,
  PriceChart,
} from './../../types.d'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

type OptionType = { label: string; value: number }

interface GetNftsData {
  nfts: Nft[]
  creator: Creator
}

const GET_NFTS = gql`
  query GetNfts(
    $creators: [PublicKey!]!
    $owners: [PublicKey!]
    $listed: Boolean
    $auctionHouses: [PublicKey!]
    $offerers: [PublicKey!]
    $limit: Int!
    $offset: Int!
    $attributes: [AttributeFilter!]
  ) {
    nfts(
      creators: $creators
      owners: $owners
      auctionHouses: $auctionHouses
      listed: $listed
      auctionHouses: $auctionHouses
      offerers: $offerers
      limit: $limit
      offset: $offset
      attributes: $attributes
    ) {
      address
      name
      description
      image
      owner {
        address
        associatedTokenAccountAddress
      }
      creators {
        address
        verified
        twitterHandle
        profile {
          handle
          profileImageUrl
          bannerImageUrl
        }
      }
      offers {
        address
      }
      listings {
        address
        auctionHouse
        price
      }
    }
  }
`

const GET_COLLECTION_INFO = gql`
  query GetCollectionInfo($creator: String!, $auctionHouses: [PublicKey!]!) {
    creator(address: $creator) {
      address
      stats(auctionHouses: $auctionHouses) {
        auctionHouse
        volume24hr
        average
        floor
      }
      counts {
        creations
      }
      attributeGroups {
        name
        variants {
          name
          count
        }
      }
    }
  }
`

export const GET_PRICE_CHART_DATA = gql`
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
      salesAverage {
        price
        date
      }
    }
  }
`

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain']

  const {
    data: { marketplace, creator },
  } = await client.query<GetCollectionPage>({
    fetchPolicy: 'no-cache',
    query: gql`
      query GetCollectionPage($subdomain: String!, $creator: String!) {
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
        creator(address: $creator) {
          address
        }
      }
    `,
    variables: {
      subdomain: subdomain || SUBDOMAIN,
      creator: query.creator,
    },
  })

  if (
    or(
      any(isNil)([marketplace, creator]),
      pipe(
        map(prop('creatorAddress')),
        indexOf(query.creator),
        equals(-1)
      )(marketplace?.creators || [])
    )
  ) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      marketplace,
      creator,
    },
  }
}

interface GetCollectionPage {
  marketplace: Marketplace | null
  creator: Creator | null
}

interface GetCollectionInfo {
  creator: Creator
}

interface CreatorPageProps extends AppProps {
  marketplace: Marketplace
  creator: Creator
}

interface NftFilterForm {
  attributes: AttributeFilter[]
  preset: PresetNftFilter
}

export interface GetPriceChartData {
  charts: PriceChart
}

const startDate = subDays(new Date(), 6).toISOString()
const endDate = new Date().toISOString()

const CreatorShow: NextPage<CreatorPageProps> = ({ marketplace, creator }) => {
  const wallet = useWallet()
  const { publicKey, connected } = wallet
  const [hasMore, setHasMore] = useState(true)
  const { sidebarOpen, toggleSidebar } = useSidebar()
  const router = useRouter()
  const {
    data,
    loading: loadingNfts,
    refetch,
    fetchMore,
    variables,
  } = useQuery<GetNftsData>(GET_NFTS, {
    fetchPolicy: 'network-only',
    variables: {
      creators: [router.query.creator],
      auctionHouses: [marketplace.auctionHouse.address],
      offset: 0,
      limit: 24,
    },
  })

  const collectionQuery = useQuery<GetCollectionInfo>(GET_COLLECTION_INFO, {
    variables: {
      creator: router.query.creator,
      auctionHouses: [marketplace.auctionHouse.address],
    },
  })

  const nftCountsQuery = useQuery<GetNftCounts>(GET_NFT_COUNTS, {
    fetchPolicy: 'network-only',
    variables: {
      creators: [router.query.creator],
      auctionHouses: [marketplace.auctionHouse.address],
    },
  })

  const [getWalletCounts, walletCountsQuery] = useLazyQuery<GetWalletCounts>(
    GET_WALLET_COUNTS,
    {
      variables: {
        address: publicKey?.toBase58(),
        creators: [router.query.creator],
        auctionHouses: [marketplace.auctionHouse.address],
      },
    }
  )

  const priceChartDataQuery = useQuery<GetPriceChartData>(
    GET_PRICE_CHART_DATA,
    {
      fetchPolicy: 'network-only',
      variables: {
        auctionHouses: [marketplace.auctionHouse.address],
        creators: [router.query.creator],
        startDate: startDate,
        endDate: endDate,
      },
    }
  )

  const { control, watch } = useForm<NftFilterForm>({
    defaultValues: { preset: PresetNftFilter.All },
  })

  const loading =
    loadingNfts ||
    collectionQuery.loading ||
    nftCountsQuery.loading ||
    walletCountsQuery.loading

  useEffect(() => {
    if (publicKey) {
      getWalletCounts()
    }
  }, [publicKey, getWalletCounts])

  useEffect(() => {
    const subscription = watch(({ attributes, preset }) => {
      const pubkey = publicKey?.toBase58()
      const nextAttributes = pipe(
        filter(pipe(prop('values'), isEmpty, not)),
        map(modify('values', map(prop('value'))))
      )(attributes)

      const owners = ifElse(
        equals(PresetNftFilter.Owned),
        always([pubkey]),
        always(null)
      )(preset as PresetNftFilter)

      const offerers = ifElse(
        equals(PresetNftFilter.OpenOffers),
        always([pubkey]),
        always(null)
      )(preset as PresetNftFilter)

      const listed = ifElse(
        equals(PresetNftFilter.Listed),
        always(true),
        always(false)
      )(preset as PresetNftFilter)

      refetch({
        creators: [router.query.creator],
        auctionHouses: [marketplace.auctionHouse.address],
        attributes: nextAttributes,
        owners,
        offerers,
        listed,
        offset: 0,
      }).then(({ data: { nfts } }) => {
        pipe(pipe(length, equals(variables?.limit)), setHasMore)(nfts)
      })
    })
    return () => subscription.unsubscribe()
  }, [
    watch,
    publicKey,
    marketplace,
    refetch,
    variables?.limit,
    router.query.creator,
    creator,
  ])

  return (
    <>
      <Head>
        <title>
          {truncateAddress(router.query?.creator as string)} NFT Collection |{' '}
          {marketplace.name}
        </title>
        <link rel="icon" href={marketplace.logoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={marketplace.name} />
        <meta
          property="og:title"
          content={`${truncateAddress(
            router.query?.creator as string
          )} NFT Collection | ${marketplace.name}`}
        />
        <meta property="og:image" content={marketplace.bannerUrl} />
        <meta property="og:description" content={marketplace.description} />
      </Head>
      <div className="relative grid justify-between w-full grid-cols-12 gap-4 mt-20 mb-20">
        <div className="col-span-12 mb-6 md:col-span-8">
          <img
            src={marketplace.logoUrl}
            alt={marketplace.name}
            className="absolute object-cover bg-gray-900 border-4 border-gray-900 rounded-full w-28 h-28 -top-32"
          />
          <p className="text-lg text-gray-300 mb-2">Created by</p>
          <h1 className="mb-4 text-3xl pubkey">
            {truncateAddress(router.query?.creator as string)}
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 grid grid-cols-3 gap-x-1 gap-y-6 lg:-mt-8">
          <div className="col-span-1">
            <span className="text-gray-300 uppercase font-semibold text-xs block w-full mb-2">
              Floor
            </span>
            {loading ? (
              <div className="block bg-gray-800 w-20 h-6 rounded" />
            ) : (
              <span className="sol-amount text-xl font-semibold">
                {toSOL(
                  (collectionQuery.data?.creator.stats[0]?.floor.toNumber() ||
                    0) as number
                )}
              </span>
            )}
          </div>
          <div className="col-span-1">
            <span className="text-gray-300 uppercase font-semibold text-xs block w-full mb-2">
              Vol Last 24h
            </span>
            {loading ? (
              <div className="block bg-gray-800 w-20 h-6 rounded" />
            ) : (
              <span className="sol-amount text-xl font-semibold">
                {toSOL(
                  (collectionQuery.data?.creator.stats[0]?.volume24hr.toNumber() ||
                    0) as number
                )}
              </span>
            )}
          </div>
          <Link href={`/creators/${router.query.creator}/analytics`} passHref>
            <a className="col-span-1 lg:col-span-2 flex justify-end">
              <Button
                size={ButtonSize.Small}
                type={ButtonType.Secondary}
                icon={<img src="/images/analytics_icon.svg" className="mr-2" />}
              >
                Details & Activity
              </Button>
            </a>
          </Link>
          <div className="col-span-3 lg:col-span-4">
            <div className="flex flex-col w-full">
              <span className="uppercase text-gray-300 text-xs font-semibold mb-1 place-self-end">
                Price LAST 7 DAYS
              </span>
              {loading ? (
                <div className="w-full h-[120px] bg-gray-800 rounded" />
              ) : (
                <Chart
                  height={120}
                  showXAxis={false}
                  className="w-full"
                  chartData={priceChartDataQuery.data?.charts?.salesAverage}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex">
        <div className="relative">
          <div
            className={cx(
              'fixed top-0 right-0 bottom-0 left-0 z-10 bg-gray-900 flex-row flex-none space-y-2 sm:sticky sm:block sm:w-64 sm:mr-8  overflow-auto h-screen',
              {
                hidden: not(sidebarOpen),
              }
            )}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
              }}
              className="px-4 py-4 sm:px-0"
            >
              <ul className="flex flex-col gap-2 flex-grow mb-6">
                <li>
                  <Controller
                    control={control}
                    name="preset"
                    render={({ field: { value, onChange } }) => (
                      <label
                        htmlFor="preset-all"
                        className={cx(
                          'flex items-center w-full px-4 py-2 rounded-md cursor-pointer hover:bg-gray-800',
                          {
                            'bg-gray-800': loading,
                          }
                        )}
                      >
                        <input
                          onChange={onChange}
                          className="mr-3 appearance-none rounded-full h-3 w-3 
                              border border-gray-100 bg-gray-700 
                              checked:bg-gray-100 focus:outline-none bg-no-repeat bg-center bg-contain"
                          type="radio"
                          name="preset"
                          disabled={loading}
                          hidden={loading}
                          value={PresetNftFilter.All}
                          id="preset-all"
                          checked={value === PresetNftFilter.All}
                        />
                        {loading ? (
                          <div className="h-6 w-full" />
                        ) : (
                          <div className="w-full flex justify-between">
                            <div>All</div>
                            <div className="text-gray-300">
                              {nftCountsQuery.data?.nftCounts.total}
                            </div>
                          </div>
                        )}
                      </label>
                    )}
                  />
                </li>
                <li>
                  <Controller
                    control={control}
                    name="preset"
                    render={({ field: { value, onChange } }) => (
                      <label
                        htmlFor="preset-listed"
                        className={cx(
                          'flex items-center w-full px-4 py-2 rounded-md cursor-pointer hover:bg-gray-800',
                          {
                            'bg-gray-800': loading,
                          }
                        )}
                      >
                        <input
                          onChange={onChange}
                          className="mr-3 appearance-none rounded-full h-3 w-3 
                              border border-gray-100 bg-gray-700 
                              checked:bg-gray-100 focus:outline-none bg-no-repeat bg-center bg-contain"
                          disabled={loading}
                          hidden={loading}
                          type="radio"
                          name="preset"
                          value={PresetNftFilter.Listed}
                          id="preset-listed"
                        />
                        {loading ? (
                          <div className="h-6 w-full" />
                        ) : (
                          <div className="w-full flex justify-between">
                            <div>Current listings</div>
                            <div className="text-gray-300">
                              {nftCountsQuery.data?.nftCounts.listed}
                            </div>
                          </div>
                        )}
                      </label>
                    )}
                  />
                </li>
                {connected && (
                  <>
                    <li>
                      <Controller
                        control={control}
                        name="preset"
                        render={({ field: { value, onChange } }) => (
                          <label
                            htmlFor="preset-owned"
                            className={cx(
                              'flex items-center w-full px-4 py-2 rounded-md cursor-pointer hover:bg-gray-800',
                              {
                                'bg-gray-800': loading,
                              }
                            )}
                          >
                            <input
                              onChange={onChange}
                              className="mr-3 appearance-none rounded-full h-3 w-3 
                                  border border-gray-100 bg-gray-700 
                                  checked:bg-gray-100 focus:outline-none bg-no-repeat bg-center bg-contain"
                              type="radio"
                              name="preset"
                              disabled={loading}
                              hidden={loading}
                              value={PresetNftFilter.Owned}
                              id="preset-owned"
                            />
                            {loading ? (
                              <div className="h-6 w-full" />
                            ) : (
                              <div className="w-full flex justify-between">
                                <div>Owned by me</div>
                                <div className="text-gray-300">
                                  {
                                    walletCountsQuery.data?.wallet?.nftCounts
                                      .owned
                                  }
                                </div>
                              </div>
                            )}
                          </label>
                        )}
                      />
                    </li>
                    <li>
                      <Controller
                        control={control}
                        name="preset"
                        render={({ field: { value, onChange } }) => (
                          <label
                            htmlFor="preset-open"
                            className={cx(
                              'flex items-center w-full px-4 py-2 rounded-md cursor-pointer hover:bg-gray-800',
                              {
                                'bg-gray-800': loading,
                              }
                            )}
                          >
                            <input
                              onChange={onChange}
                              className="mr-3 appearance-none rounded-full h-3 w-3 
                                  border border-gray-100 bg-gray-700 
                                  checked:bg-gray-100 focus:outline-none bg-no-repeat bg-center bg-contain"
                              disabled={loading}
                              hidden={loading}
                              type="radio"
                              name="preset"
                              value={PresetNftFilter.OpenOffers}
                              id="preset-open"
                            />
                            {loading ? (
                              <div className="h-6 w-full" />
                            ) : (
                              <div className="w-full flex justify-between">
                                <div>My open offers</div>
                                <div className="text-gray-300">
                                  {
                                    walletCountsQuery.data?.wallet?.nftCounts
                                      .offered
                                  }
                                </div>
                              </div>
                            )}
                          </label>
                        )}
                      />
                    </li>
                  </>
                )}
              </ul>
              <div className="flex flex-col flex-grow gap-4">
                {loading ? (
                  <>
                    <div className="flex flex-col flex-grow gap-2">
                      <label className="block h-4 bg-gray-800 rounded w-14" />
                      <div className="block w-full h-10 bg-gray-800 rounded" />
                    </div>
                    <div className="flex flex-col flex-grow gap-2">
                      <label className="block h-4 bg-gray-800 rounded w-14" />
                      <div className="block w-full h-10 bg-gray-800 rounded" />
                    </div>
                    <div className="flex flex-col flex-grow gap-2">
                      <label className="block h-4 bg-gray-800 rounded w-14" />
                      <div className="block w-full h-10 bg-gray-800 rounded" />
                    </div>
                    <div className="flex flex-col flex-grow gap-2">
                      <label className="block h-4 bg-gray-800 rounded w-14" />
                      <div className="block w-full h-10 bg-gray-800 rounded" />
                    </div>
                  </>
                ) : (
                  collectionQuery.data?.creator.attributeGroups.map(
                    ({ name: group, variants }, index) => (
                      <div
                        className="flex flex-col flex-grow gap-2"
                        key={group}
                      >
                        <label className="label">{group}</label>
                        <Controller
                          control={control}
                          name={`attributes.${index}`}
                          defaultValue={{ traitType: group, values: [] }}
                          render={({ field: { onChange, value } }) => {
                            return (
                              <Select
                                value={value.values}
                                isMulti
                                className="select-base-theme"
                                classNamePrefix="base"
                                onChange={(next: ValueType<OptionType>) => {
                                  onChange({ traitType: group, values: next })
                                }}
                                options={
                                  variants.map(({ name, count }) => ({
                                    value: name,
                                    label: `${name} (${count})`,
                                  })) as OptionsType<OptionType>
                                }
                              />
                            )
                          }}
                        />
                      </div>
                    )
                  )
                )}
              </div>
            </form>
          </div>
        </div>
        <div className="grow">
          <List
            data={data?.nfts}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={async (inView) => {
              if (not(inView)) {
                return
              }

              const {
                data: { nfts },
              } = await fetchMore({
                variables: {
                  ...variables,
                  offset: length(data?.nfts || []),
                },
              })

              when(isEmpty, partial(setHasMore, [false]))(nfts)
            }}
            loadingComponent={<NftCard.Skeleton />}
            emptyComponent={
              <div className="w-full p-10 text-center border border-gray-800 rounded-lg">
                <h3>No NFTs found</h3>
                <p className="text-gray-500 mt-">
                  No NFTs found matching these criteria.
                </p>
              </div>
            }
            itemRender={(nft) => {
              return (
                <Link href={`/nfts/${nft.address}`} key={nft.address} passHref>
                  <a>
                    <NftCard nft={nft} marketplace={marketplace} />
                  </a>
                </Link>
              )
            }}
          />
        </div>
      </div>
      <Button
        size={ButtonSize.Small}
        icon={<Filter size={16} className="mr-2" />}
        className="fixed z-10 bottom-4 sm:hidden"
        onClick={toggleSidebar}
      >
        Filter
      </Button>
    </>
  )
}

CreatorShow.getLayout = function GetLayout(page: ReactElement): ReactElement {
  return (
    <BannerLayout marketplace={page.props.marketplace}>{page}</BannerLayout>
  )
}

export default CreatorShow
