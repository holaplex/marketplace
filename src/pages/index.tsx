import { gql, useQuery, useLazyQuery } from '@apollo/client'
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
import { useEffect, useState } from 'react'
import { Filter } from 'react-feather'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import client from '../client'
import Button, { ButtonSize, ButtonType } from '../components/Button'
import WalletPortal from '../components/WalletPortal'
import { Slider } from '../components/Slider'
import { useSidebar } from '../hooks/sidebar'
import { addressAvatar, truncateAddress } from '../modules/address'
import { toSOL } from '../modules/lamports'
import {
  AttributeFilter,
  Creator,
  Marketplace,
  Nft,
  NftCount,
  PresetNftFilter,
  Wallet,
} from '../types.d'
import { List } from './../components/List'
import { NftCard } from './../components/NftCard'
import Chart from './../components/Chart'
import { GetPriceChartData, GET_PRICE_CHART_DATA } from './analytics'
import { subDays } from 'date-fns'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

interface GetNftsData {
  nfts: Nft[]
  creator: Creator
}

const GET_NFTS = gql`
  query GetNfts(
    $creators: [PublicKey!]!
    $owners: [PublicKey!]
    $listed: [PublicKey!]
    $offerers: [PublicKey!]
    $limit: Int!
    $offset: Int!
  ) {
    nfts(
      creators: $creators
      owners: $owners
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
          profileImageUrl
          bannerImageUrl
        }
      }
      offers {
        address
        price
      }
      listings {
        address
        auctionHouse
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
          profileImageUrl
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

  if (pipe(length, equals(1))(marketplace.creators)) {
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
}

const startDate = subDays(new Date(), 6).toISOString()
const endDate = new Date().toISOString()

const Home: NextPage<HomePageProps> = ({ marketplace }) => {
  const { publicKey, connected } = useWallet()
  const creators = map(prop('creatorAddress'))(marketplace.creators)
  const marketplaceQuery = useQuery<GetMarketplaceInfo>(GET_MARKETPLACE_INFO, {
    variables: {
      subdomain: marketplace.subdomain,
    },
  })

  const nftCountsQuery = useQuery<GetNftCounts>(GET_NFT_COUNTS, {
    variables: {
      creators,
      auctionHouses: [marketplace.auctionHouse.address],
    },
  })

  const [getWalletCounts, walletCountsQuery] = useLazyQuery<GetWalletCounts>(
    GET_WALLET_COUNTS,
    {
      variables: {
        address: publicKey?.toBase58(),
        creators,
        auctionHouses: [marketplace.auctionHouse.address],
      },
    }
  )

  const nftsQuery = useQuery<GetNftsData>(GET_NFTS, {
    fetchPolicy: 'network-only',
    variables: {
      creators,
      offset: 0,
      limit: 48,
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
        auctionHouses: [marketplace.auctionHouse.address],
        startDate: startDate,
        endDate: endDate,
      },
    }
  )

  const { sidebarOpen, toggleSidebar } = useSidebar()

  const [hasMore, setHasMore] = useState(true)

  const { watch, control } = useForm<NftFilterForm>({
    defaultValues: { preset: PresetNftFilter.All },
  })

  useEffect(() => {
    if (publicKey) {
      getWalletCounts()
    }
  }, [publicKey, getWalletCounts])

  useEffect(() => {
    const subscription = watch(({ preset }) => {
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
        always([marketplace.auctionHouse.address]),
        always(null)
      )(preset as PresetNftFilter)

      nftsQuery
        .refetch({
          creators,
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
    priceChartDataQuery.loading

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

      <div className="relative w-full">
        <div className="absolute flex justify-end right-6 top-[28px]">
          <div className="flex items-center justify-end">
            {equals(
              publicKey?.toBase58(),
              marketplace.auctionHouse.authority
            ) && (
              <Link
                to="/admin/marketplace/edit"
                className="text-sm cursor-pointer mr-6 hover:underline "
              >
                Admin Dashboard
              </Link>
            )}
            <Link
              to="/creators"
              className="text-sm cursor-pointer mr-6 hover:underline"
            >
              Creators
            </Link>
            <WalletPortal />
          </div>
        </div>
        <img
          src={marketplace.bannerUrl}
          alt={marketplace.name}
          className="object-cover w-full h-44 md:h-60 lg:h-80 xl:h-[20rem] 2xl:h-[28rem]"
        />
      </div>
      <div className="w-full max-w-[1800px] px-6 md:px-12">
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
                  {toSOL(
                    (marketplaceQuery.data?.marketplace.auctionHouse.stats?.floor.toNumber() ||
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
                    (marketplaceQuery.data?.marketplace.auctionHouse.stats?.volume24hr.toNumber() ||
                      0) as number
                  )}
                </span>
              )}
            </div>
            <Link
              to="/analytics"
              className="col-span-1 lg:col-span-2 flex justify-end"
            >
              <Button
                size={ButtonSize.Small}
                type={ButtonType.Secondary}
                icon={<img src="/images/analytics_icon.svg" className="mr-2" />}
              >
                Details & Activity
              </Button>
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
                    chartData={priceChartDataQuery.data?.charts.salesAverage}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-6">
          <h3>Creators</h3>
          <Link
            to="/creators"
            className="text-sm text-gray-300 hover:underline"
          >
            See all
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
                  <div className="bg-gray-800 w-full aspect-square" />
                  <div className="bg-gray-800 w-full aspect-square" />
                  <div className="bg-gray-800 w-full aspect-square hidden md:block" />
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
                  <div className="bg-gray-800 w-full aspect-square" />
                  <div className="bg-gray-800 w-full aspect-square" />
                  <div className="bg-gray-800 w-full aspect-square hidden md:block" />
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
                  <div className="bg-gray-800 w-full aspect-square" />
                  <div className="bg-gray-800 w-full aspect-square" />
                  <div className="bg-gray-800 w-full aspect-square hidden md:block" />
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
                  className="flex transition-transform hover:scale-[1.02] snap-start z-0 mr-4"
                  key={creator.creatorAddress}
                  to={`/creators/${creator.creatorAddress}`}
                >
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
                            )(creator.profile?.profileImageUrl) as string
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
                  <Link to={`/nfts/${nft.address}`} key={nft.address}>
                    <NftCard nft={nft} marketplace={marketplace} />
                  </Link>
                )
              }}
            />
          </div>
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
    </div>
  )
}

export default Home
