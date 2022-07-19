import {
  gql,
  useQuery,
  useLazyQuery,
  QueryResult,
  OperationVariables,
} from '@apollo/client'
import { useWallet } from '@solana/wallet-adapter-react'
import cx from 'classnames'
import { NextPage, NextPageContext } from 'next'
import { PublicKey } from '@solana/web3.js'
import { AppProps } from 'next/app'
import Head from 'next/head'
import {
  always,
  equals,
  ifElse,
  isEmpty,
  isNil,
  length,
  map,
  not,
  partial,
  pipe,
  prop,
  when,
} from 'ramda'
import React, { ReactElement, useEffect, useState } from 'react'
import { toSOL } from '../modules/sol'
import { Filter } from 'react-feather'
import { Controller, useForm } from 'react-hook-form'
import Link from 'next/link'
import client from '../client'
import Button, { ButtonSize, ButtonType } from '../components/Button'
import { BannerLayout } from '../layouts/Banner'
import { Slider } from '../components/Slider'
import { useSidebar } from '../hooks/sidebar'
import { addressAvatar, truncateAddress } from '../modules/address'
import {
  AttributeFilter,
  Creator,
  Marketplace,
  Nft,
  PresetNftFilter,
  GetPriceChartData,
  NftCount,
  Wallet,
} from '@holaplex/marketplace-js-sdk'
import { List } from './../components/List'
import { NftCard } from './../components/NftCard'
import { subDays } from 'date-fns'
import Chart from './../components/Chart'
import { useTokenList } from 'src/hooks/tokenList'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

interface GetNftsData {
  nfts: Nft[]
  creator: Creator
}

const GET_NFTS = gql`
  query GetNfts(
    $creators: [PublicKey!]!
    $owners: [PublicKey!]
    $auctionHouses: [PublicKey!]
    $listed: Boolean
    $offerers: [PublicKey!]
    $limit: Int!
    $offset: Int!
  ) {
    nfts(
      creators: $creators
      owners: $owners
      auctionHouses: $auctionHouses
      listed: $listed
      offerers: $offerers
      limit: $limit
      offset: $offset
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
          profileImageUrlLowres
          bannerImageUrl
        }
      }
      offers {
        id
      }
      listings {
        id
        auctionHouse {
          address
          treasuryMint
        }
        price
      }
    }
  }
`

export interface GetNftCounts {
  nftCounts: NftCount
}

export interface GetWalletCounts {
  wallet: Wallet
}

export const GET_NFT_COUNTS = gql`
  query GetNftCounts($creators: [PublicKey!]!, $auctionHouses: [PublicKey!]) {
    nftCounts(creators: $creators) {
      total
      listed(auctionHouses: $auctionHouses)
    }
  }
`

export const GET_LISTED_TOKEN_NFT_COUNT = gql`
  query GetNftCounts($creators: [PublicKey!]!, $auctionHouse: PublicKey!) {
    nftCounts(creators: $creators) {
      listed(auctionHouses: [$auctionHouse])
    }
  }
`

export const GET_WALLET_COUNTS = gql`
  query GetWalletCounts(
    $address: PublicKey!
    $creators: [PublicKey!]
    $auctionHouses: [PublicKey!]
  ) {
    wallet(address: $address) {
      address
      nftCounts(creators: $creators) {
        owned
        offered(auctionHouses: $auctionHouses)
        listed(auctionHouses: $auctionHouses)
      }
    }
  }
`

const GET_CREATORS_PREVIEW = gql`
  query GetCretorsPreview($subdomain: String!) {
    marketplace(subdomain: $subdomain) {
      subdomain
      ownerAddress
      creators {
        creatorAddress
        storeConfigAddress
        twitterHandle
        nftCount
        preview {
          address
          image
        }
        profile {
          handle
          profileImageUrlLowres
        }
      }
    }
  }
`

const GET_MARKETPLACE_INFO = gql`
  query GetMarketplaceInfo($subdomain: String!) {
    marketplace(subdomain: $subdomain) {
      subdomain
      ownerAddress
      stats {
        nfts
      }
      auctionHouses {
        address
        treasuryMint
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

export const GET_PRICE_CHART_DATA = gql`
  query GetPriceChartData(
    $auctionHouses: [PublicKey!]!
    $creators: [PublicKey!]
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
          ownerAddress
          creators {
            creatorAddress
            storeConfigAddress
          }
          auctionHouses {
            address
            treasuryMint
            authority
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

  if (marketplace.creators && pipe(length, equals(1))(marketplace.creators)) {
    return {
      redirect: {
        permanent: false,
        destination: `/creators/${marketplace.creators[0].creatorAddress}`,
      },
    }
  }

  return {
    props: {
      marketplace,
    },
  }
}

interface GetMarketplace {
  marketplace: Marketplace | null
}

interface GetMarketplaceInfo {
  marketplace: Marketplace
}

interface GetCreatorPreviews {
  marketplace: Marketplace
}

interface HomePageProps extends AppProps {
  marketplace: Marketplace
}

interface NftFilterForm {
  attributes: AttributeFilter[]
  preset: PresetNftFilter
  tokens: string[]
}

const startDate = subDays(new Date(), 6).toISOString()
const endDate = new Date().toISOString()

const Home: NextPage<HomePageProps> = ({ marketplace }) => {
  const { publicKey, connected } = useWallet()
  const creators = map(prop('creatorAddress'))(marketplace.creators || [])
  const auctionHouses = map(prop('address'))(marketplace.auctionHouses || [])
  const [tokenMap, loadingTokens] = useTokenList()

  const marketplaceQuery = useQuery<GetMarketplaceInfo>(GET_MARKETPLACE_INFO, {
    variables: {
      subdomain: marketplace.subdomain,
    },
  })

  const nftCountsQuery = useQuery<GetNftCounts>(GET_NFT_COUNTS, {
    variables: {
      creators,
      auctionHouses: auctionHouses,
    },
  })

  const listedCountQueryMap = new Map<
    String,
    QueryResult<GetNftCounts, OperationVariables>
  >()

  marketplace.auctionHouses?.forEach((auctionHouse) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const query = useQuery<GetNftCounts>(GET_LISTED_TOKEN_NFT_COUNT, {
      variables: {
        creators,
        auctionHouse: auctionHouse.address,
      },
    })
    listedCountQueryMap.set(auctionHouse.treasuryMint, query)
  })

  const [getWalletCounts, walletCountsQuery] = useLazyQuery<GetWalletCounts>(
    GET_WALLET_COUNTS,
    {
      variables: {
        address: publicKey?.toBase58(),
        creators,
        auctionHouses: auctionHouses,
      },
    }
  )

  const nftsQuery = useQuery<GetNftsData>(GET_NFTS, {
    fetchPolicy: 'network-only',
    variables: {
      creators,
      auctionHouses: auctionHouses,
      offset: 0,
      limit: 24,
    },
  })

  const creatorsQuery = useQuery<GetCreatorPreviews>(GET_CREATORS_PREVIEW, {
    variables: {
      subdomain: marketplace.subdomain,
    },
  })

  const priceChartDataQuery = useQuery<GetPriceChartData>(
    GET_PRICE_CHART_DATA,
    {
      fetchPolicy: 'network-only',
      variables: {
        auctionHouses: auctionHouses,
        creators: creators,
        startDate: startDate,
        endDate: endDate,
      },
    }
  )

  const { sidebarOpen, toggleSidebar } = useSidebar()

  const [hasMore, setHasMore] = useState(true)

  const tokens = marketplace?.auctionHouses?.map(({ treasuryMint }) =>
    tokenMap.get(treasuryMint)
  )

  // DUMMY TOKENS FOR TESTING
  // const tokens = [
  //   tokenMap.get('So11111111111111111111111111111111111111112'),
  //   tokenMap.get('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  // ]

  const { watch, control, getValues } = useForm<NftFilterForm>({
    defaultValues: {
      preset: PresetNftFilter.All,
      tokens: [] as string[],
    },
  })

  const stats = marketplaceQuery.data?.marketplace.auctionHouses[0].stats

  useEffect(() => {
    if (publicKey) {
      getWalletCounts()
    }
  }, [publicKey, getWalletCounts])

  useEffect(() => {
    const subscription = watch(({ preset, tokens }) => {
      let selectedAuctionHouses = auctionHouses
      if (
        preset === PresetNftFilter.Listed &&
        tokens?.some((t) => t !== undefined)
      ) {
        selectedAuctionHouses = marketplace.auctionHouses
          ?.filter(({ treasuryMint }) => tokens?.includes(treasuryMint))
          .map(({ address }) => address) as string[]
      }

      const pubkey = publicKey?.toBase58()

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
        always(null)
      )(preset as PresetNftFilter)

      nftsQuery
        .refetch({
          creators,
          auctionHouses: selectedAuctionHouses,
          owners,
          offerers,
          listed,
          offset: 0,
        })
        .then(({ data: { nfts } }) => {
          pipe(
            pipe(length, equals(nftsQuery.variables?.limit)),
            setHasMore
          )(nfts)
        })
    })
    return () => subscription.unsubscribe()
  }, [
    watch,
    publicKey,
    marketplace,
    nftsQuery.refetch,
    creators,
    nftsQuery.variables?.limit,
  ])

  const loading =
    creatorsQuery.loading ||
    marketplaceQuery.loading ||
    nftsQuery.loading ||
    nftCountsQuery.loading ||
    walletCountsQuery.loading ||
    priceChartDataQuery.loading ||
    loadingTokens

  return (
    <>
      <Head>
        <title>{marketplace.name}</title>
        <link rel="icon" href={marketplace.logoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={marketplace.name} />
        <meta property="og:title" content={marketplace.name} />
        <meta property="og:image" content={marketplace.bannerUrl} />
        <meta property="og:description" content={marketplace.description} />
      </Head>
      <div className="relative grid grid-cols-12 gap-4 justify-between w-full mt-20 mb-20">
        <div className="col-span-12 md:col-span-8 mb-6">
          <img
            src={marketplace.logoUrl}
            alt={marketplace.name}
            className="absolute border-4 object-cover border-gray-900 bg-gray-900 rounded-full w-28 h-28 -top-32"
          />
          <h1 className="text-lg md:text-2xl lg:text-4xl">
            {marketplace.name}
          </h1>
          <p className="mt-4 max-w-prose text-gray-300 sm:mr-12">
            {marketplace.description}
          </p>
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
                {toSOL((stats?.floor.toNumber() || 0) as number)}
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
                {toSOL((stats?.volume24hr.toNumber() || 0) as number)}
              </span>
            )}
          </div>
          <Link href="/analytics" passHref>
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
      <div className="flex justify-between items-center mb-6">
        <h3>Creators</h3>
        <Link href="/creators" passHref>
          <a className="text-sm text-gray-300 hover:underline">See all</a>
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-20 gap-4">
          <div className="flex w-full">
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <div className="bg-gray-800 rounded-full w-10 h-10" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 mb-2 gap-4">
                <div className="bg-gray-800 w-full aspect-square rounded-md" />
                <div className="bg-gray-800 w-full aspect-square rounded-md" />
                <div className="bg-gray-800 w-full aspect-square rounded-md hidden md:block" />
              </div>
            </div>
          </div>
          <div className="hidden md:flex w-full">
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <div className="bg-gray-800 rounded-full w-10 h-10" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 mb-2 gap-4">
                <div className="bg-gray-800 w-full aspect-square rounded-md" />
                <div className="bg-gray-800 w-full aspect-square rounded-md" />
                <div className="bg-gray-800 w-full aspect-square rounded-md hidden md:block" />
              </div>
            </div>
          </div>
          <div className="hidden lg:flex w-full">
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <div className="bg-gray-800 rounded-full w-10 h-10" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 mb-2 gap-4">
                <div className="bg-gray-800 w-full aspect-square rounded-md" />
                <div className="bg-gray-800 w-full aspect-square rounded-md" />
                <div className="bg-gray-800 w-full aspect-square rounded-md hidden md:block" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Slider
          className="mb-20"
          responsive={{
            superLargeDesktop: {
              breakpoint: { max: 4000, min: 3000 },
              items: 5,
            },
            desktop: {
              breakpoint: { max: 3000, min: 1024 },
              items: 3,
            },
            tablet: {
              breakpoint: { max: 1024, min: 620 },
              items: 2,
            },
            mobile: {
              breakpoint: { max: 620, min: 0 },
              items: 1,
            },
          }}
        >
          {creatorsQuery.data?.marketplace.creators.map((creator) => {
            return (
              <Link
                key={creator.creatorAddress}
                href={`/creators/${creator.creatorAddress}`}
                passHref
              >
                <a className="flex transition-transform hover:scale-[1.02] snap-start z-0 mr-4">
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <img
                          src={
                            when(
                              isNil,
                              always(
                                addressAvatar(
                                  new PublicKey(creator.creatorAddress)
                                )
                              )
                            )(creator.profile?.profileImageUrlLowres) as string
                          }
                          className="object-cover bg-gray-900 rounded-full w-10 h-10"
                        />
                        <div className="text-sm ml-3">
                          {creator.twitterHandle ? (
                            <span className="font-semibold">{`@${creator.twitterHandle}`}</span>
                          ) : (
                            <span className="pubkey">
                              {truncateAddress(creator.creatorAddress)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-gray-300 text-sm">NFTs</span>
                        <span className="text-sm">{creator.nftCount}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 mb-2 gap-4">
                      {creator.preview.map((nft, index) => {
                        return (
                          <div
                            key={nft.address}
                            className={cx('w-full', {
                              'hidden md:block':
                                index === creator.preview.length - 1,
                            })}
                          >
                            <img
                              className="object-cover rounded-md grow aspect-square"
                              src={nft.image}
                              alt={nft.name}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </a>
              </Link>
            )
          })}
        </Slider>
      )}
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
              className="py-4 px-4 sm:px-0"
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
                      <>
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
                      </>
                    )}
                  />
                </li>
                {getValues().preset === PresetNftFilter.Listed &&
                  tokens.map((token, index) => (
                    <li key={token?.address}>
                      <Controller
                        control={control}
                        name={`tokens.${index}`}
                        render={({ field: { value, onChange } }) => (
                          <label
                            htmlFor={token?.address}
                            className={cx(
                              'flex items-center w-full px-4 py-2 rounded-md cursor-pointer hover:bg-gray-800',
                              {
                                'bg-gray-800': loading,
                              }
                            )}
                          >
                            <input
                              onChange={(event) => {
                                onChange(
                                  event.target.checked
                                    ? token?.address
                                    : undefined
                                )
                              }}
                              className="ml-4 mr-3 appearance-none rounded-sm h-3 w-3 focus:outline-none 
                                border border-gray-100 bg-no-repeat bg-center bg-contain bg-gray-700 
                                checked:bg-gray-100"
                              disabled={loading}
                              hidden={loading}
                              type="checkbox"
                              checked={value === token?.address}
                              value={token?.address}
                              id={token?.address}
                            />
                            {loading ? (
                              <div className="h-6 w-full" />
                            ) : (
                              <div className="w-full flex justify-between">
                                <div>{token?.name}</div>
                                <div className="text-gray-300">
                                  {listedCountQueryMap.get(token?.address ?? '')
                                    ?.data?.nftCounts.listed ?? 0}
                                </div>
                              </div>
                            )}
                          </label>
                        )}
                      />
                    </li>
                  ))}
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
            </form>
          </div>
        </div>
        <div className="grow">
          <List
            data={nftsQuery.data?.nfts}
            loading={loading}
            loadingComponent={<NftCard.Skeleton />}
            hasMore={hasMore}
            onLoadMore={async (inView) => {
              if (not(inView)) {
                return
              }

              const { data, variables, fetchMore } = nftsQuery

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
                    <NftCard
                      nft={nft}
                      marketplace={marketplace}
                      tokenMap={tokenMap}
                    />
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
        className="fixed bottom-4 z-10 sm:hidden"
        onClick={toggleSidebar}
      >
        Filter
      </Button>
    </>
  )
}

interface HomeLayoutProps {
  marketplace: Marketplace
  children: ReactElement
}

Home.getLayout = function GetHomeLayout({
  marketplace,
  children,
}: HomeLayoutProps) {
  return <BannerLayout marketplace={marketplace}>{children}</BannerLayout>
}

export default Home
