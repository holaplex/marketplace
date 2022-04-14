import { gql, useQuery } from '@apollo/client'
import { useWallet } from '@solana/wallet-adapter-react'
import cx from 'classnames'
import { NextPage, NextPageContext } from 'next'
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
import { useEffect, useRef, useState } from 'react'
import { Filter } from 'react-feather'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import client from '../client'
import Button, { ButtonSize } from '../components/Button'
import WalletPortal from '../components/WalletPortal'
import { useSidebar } from '../hooks/sidebar'
import { truncateAddress } from '../modules/address'
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
        preview {
          address
          image
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

  const walletCountsQuery = useQuery<GetWalletCounts>(GET_WALLET_COUNTS, {
    variables: {
      address: publicKey?.toBase58(),
      creators,
      auctionHouses: [marketplace.auctionHouse.address],
    },
  })

  const nftsQuery = useQuery<GetNftsData>(GET_NFTS, {
    fetchPolicy: 'network-only',
    variables: {
      creators,
      offset: 0,
      limit: 50,
    },
  })

  const creatorsQuery = useQuery<GetCreatorPreviews>(GET_CREATORS_PREVIEW, {
    variables: {
      subdomain: marketplace.subdomain,
    },
  })

  const { sidebarOpen, toggleSidebar } = useSidebar()

  const [hasMore, setHasMore] = useState(true)

  const { watch, control } = useForm<NftFilterForm>({
    defaultValues: { preset: PresetNftFilter.All },
  })

  useEffect(() => {
    if (publicKey) {
      walletCountsQuery.refetch({
        address: publicKey?.toBase58(),
        creators,
        auctionHouses: [marketplace.auctionHouse.address],
      })
    }
  }, [creators, marketplace.auctionHouse.address, publicKey, walletCountsQuery])

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
    walletCountsQuery.loading

  const maxScrollWidth = useRef(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const carousel = useRef<any>(null)

  const movePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prevState) => prevState - 1)
    }
  }

  const moveNext = () => {
    if (
      carousel.current !== null &&
      carousel.current.offsetWidth * currentIndex <= maxScrollWidth.current
    ) {
      setCurrentIndex((prevState) => prevState + 1)
    }
  }

  useEffect(() => {
    if (carousel !== null && carousel.current !== null) {
      carousel.current.scrollLeft = carousel.current.offsetWidth * currentIndex
    }
  }, [currentIndex])

  useEffect(() => {
    maxScrollWidth.current = carousel.current
      ? carousel.current.scrollWidth - carousel.current.offsetWidth
      : 0
  }, [])

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
              className="text-sm cursor-pointer mr-6 hover:underline "
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
      <div className="w-full max-w-[1800px] px-14">
        <div className="relative grid grid-cols-12 gap-4 justify-between w-full mt-20 mb-20">
          <div className="col-span-12 md:col-span-8 mb-6">
            <img
              src={marketplace.logoUrl}
              alt={marketplace.name}
              className="absolute border-4 object-cover border-gray-900 bg-gray-900 rounded-full w-28 h-28 -top-32"
            />
            <h1>{marketplace.name}</h1>
            <p className="mt-4 max-w-prose text-gray-300 sm:mr-12">
              {marketplace.description}
            </p>
          </div>
          <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-4 md:-mt-8">
            <div>
              <span className="text-gray-300 uppercase font-semibold text-sm block w-full mb-2">
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
            <div>
              <span className="text-gray-300 uppercase font-semibold text-sm block w-full mb-2">
                Vol Last 24 hrs
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
            <div>
              <span className="text-gray-300 uppercase font-semibold text-sm block w-full mb-2">
                Avg Sale Price
              </span>
              {loading ? (
                <div className="block bg-gray-800 w-16 h-6 rounded" />
              ) : (
                <span className="sol-amount text-xl font-semibold">
                  {toSOL(
                    (marketplaceQuery.data?.marketplace.auctionHouse.stats?.average.toNumber() ||
                      0) as number
                  )}
                </span>
              )}
            </div>
            <div>
              <span className="text-gray-300 uppercase font-semibold text-sm block w-full mb-2">
                NFTs
              </span>
              {loading ? (
                <div className="block bg-gray-800 w-24 h-6 rounded" />
              ) : (
                <span className="text-xl font-semibold">
                  {marketplaceQuery.data?.marketplace.stats?.nfts || 0}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h3>Creators</h3>
          <Link to="/creators" className="text-sm text-gray-300">
            See all
          </Link>
        </div>

        <div className="relative mx-auto">
          {loading ? (
            <div className="flex gap-8 md:gap-10 mb-20">
              <div className="hover:translate-sale-1.5 bg-gray-800 h-28 w-1/2 lg:w-1/3 block" />
              <div className="hover:translate-sale-1.5 bg-gray-800 h-28 w-1/2 lg:w-1/3 block" />
            </div>
          ) : (
            <>
              <div className="flex justify-between absolute top left w-full h-full">
                <button
                  onClick={movePrev}
                  className=" text-white w-10 h-full text-center opacity-75 hover:opacity-100 z-10 p-0 m-0 transition-all ease-in-out duration-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 p-3 -ml-3 mt-5 rounded-full bg-gray-800"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="sr-only">Prev</span>
                </button>
                <button
                  onClick={moveNext}
                  className=" text-white w-10 h-full text-center opacity-75 hover:opacity-100 z-10 p-0 m-0 transition-all ease-in-out duration-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 p-3 -mr-15 mt-5 rounded-full bg-gray-800"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="sr-only">Next</span>
                </button>
              </div>
              <div
                ref={carousel}
                className="flex gap-8 md:gap-10 mb-20 overflow-hidden scroll-smooth snap-x snap-mandatory touch-pan-x z-0"
              >
                {creatorsQuery.data?.marketplace.creators.map((creator) => {
                  return (
                    <Link
                      className="flex transition-transform hover:scale-[1.02] z-0 "
                      key={creator.creatorAddress}
                      to={`/creators/${creator.creatorAddress}`}
                    >
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            {/* TODO: Add twitter handle and image once the storecreator api is updated. */}
                            {/* <img
                          src={}
                          alt={creator.creatorAddress}
                          className="object-cover bg-gray-900 rounded-full w-12 h-12 mr-2"
                        /> */}
                            <span className="text-sm">
                              {truncateAddress(
                                creator.creatorAddress as string
                              )}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            {/* TODO: Add nft counts once the api is updated. */}
                            {/* <span className="text-gray-300 text-sm">NFTs</span>
                        <span className="text-sm"></span> */}
                          </div>
                        </div>
                        <div className="hidden xl:flex mb-2 gap-4">
                          {creator.preview.map((nft) => {
                            return (
                              <div key={nft.address} className="h-28 w-28">
                                <img
                                  className="h-28 object-cover rounded-md grow"
                                  src={nft.image}
                                  alt={nft.name}
                                />
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex xl:hidden mb-2 gap-4">
                          {creator.preview.slice(0, 2).map((nft) => {
                            return (
                              <div key={nft.address} className="h-28 w-28">
                                <img
                                  className="h-28 w-full object-cover rounded-md grow"
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
              </div>
            </>
          )}
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
