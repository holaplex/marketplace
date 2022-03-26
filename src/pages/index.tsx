import { useEffect, useState } from 'react'
import { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import Head from 'next/head'
import { Link } from 'react-router-dom'

import WalletPortal from '../components/WalletPortal'
import cx from 'classnames'
import {
  isNil,
  map,
  prop,
  equals,
  partial,
  ifElse,
  always,
  length,
  not,
  when,
  isEmpty,
  apply,
  pipe,
  sum,
} from 'ramda'
import { truncateAddress, collectionNameByAddress } from '../modules/address'
import { useWallet } from '@solana/wallet-adapter-react'
import { AppProps } from 'next/app'
import { useForm, Controller } from 'react-hook-form'
import client from '../client'
import {
  Marketplace,
  Creator,
  Nft,
  PresetNftFilter,
  AttributeFilter,
} from '../types.d'
import { List } from './../components/List'
import { NftCard } from './../components/NftCard'
import Button, { ButtonSize } from '../components/Button'
import { Filter } from 'react-feather'
import { useSidebar } from '../hooks/sidebar'
import { useRouter } from 'next/router'

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
    $limit: Int!
    $offset: Int!
  ) {
    nfts(
      creators: $creators
      owners: $owners
      listed: $listed
      limit: $limit
      offset: $offset
    ) {
      address
      name
      description
      image
      owner {
        address
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

export async function getServerSideProps({ req }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain']

  const response = await client.query<GetMarketplace>({
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
        destination: `/collections/${marketplace.creators[0].creatorAddress}`,
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
  const router = useRouter()
  const creators = map(prop('creatorAddress'))(marketplace.creators)

  const { data, loading, refetch, fetchMore, variables } =
    useQuery<GetNftsData>(GET_NFTS, {
      fetchPolicy: 'network-only',
      variables: {
        creators,
        offset: 0,
        limit: 24,
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
    const subscription = watch(({ preset }) => {
      const pubkey = publicKey?.toBase58()

      const owners = ifElse(
        equals(PresetNftFilter.Owned),
        always([pubkey]),
        always(null)
      )(preset as PresetNftFilter)

      const listed = ifElse(
        equals(PresetNftFilter.Listed),
        always([marketplace.auctionHouse.address]),
        always(null)
      )(preset as PresetNftFilter)

      refetch({
        creators,
        owners,
        listed,
        offset: 0,
      }).then(({ data: { nfts } }) => {
        pipe(pipe(length, equals(variables?.limit)), setHasMore)(nfts)
      })
    })
    return () => subscription.unsubscribe()
  }, [watch, publicKey, marketplace, refetch, creators, variables?.limit])

  return (
    <div className="flex flex-col items-center text-white bg-gray-900">
      <Head>
        <title>{marketplace.name}</title>
        <link rel="icon" href={marketplace.logoUrl} />
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
            <WalletPortal />
          </div>
        </div>
        <img
          src={marketplace.bannerUrl}
          alt={marketplace.name}
          className="object-cover w-full h-30 md:h-44 lg:h-60 xl:h-[18rem]"
        />
      </div>
      <div className="w-full max-w-[1800px] px-8">
        <div className="relative flex flex-col justify-between w-full mt-20 mb-20">
          <img
            src={marketplace.logoUrl}
            alt={marketplace.name}
            className="absolute border-4 object-cover border-gray-900 bg-gray-900 rounded-full w-28 h-28 -top-32"
          />
          <h1>{marketplace.name}</h1>
          <p className="mt-4 max-w-prose">{marketplace.description}</p>
        </div>

        <h2 className="mb-2">Collections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-20">
          {creatorsQuery.loading ? (
            <>
              <div>
                <div className="flex flex-grid mb-2">
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                </div>
                <div className="bg-gray-800 h-6 w-24 block" />
              </div>
              <div>
                <div className="flex flex-grid mb-2">
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                </div>
                <div className="bg-gray-800 h-6 w-24 block" />
              </div>
            </>
          ) : (
            creatorsQuery.data?.marketplace.creators
              .filter(
                (creator) =>
                  creator.creatorAddress !=
                  '4cUyDakNPeMEZtJPDJGNujWLGF1XNH7WbQnheUEfD2xX'
              )
              .map((creator) => {
                return (
                  <Link
                    key={creator.storeConfigAddress}
                    to={`/collections/${creator.creatorAddress}`}
                  >
                    <div key={creator.creatorAddress}>
                      <div className="flex flex-grid mb-2 rounded-lg overflow-hidden">
                        {creator.preview.map((nft) => {
                          return (
                            <img
                              className="aspect-square w-1/3"
                              src={nft.image}
                              key={nft.address}
                            />
                          )
                        })}
                      </div>
                      {collectionNameByAddress(creator.creatorAddress) ??
                        truncateAddress(creator.creatorAddress)}
                    </div>
                  </Link>
                )
              })
          )}
        </div>
        <div className="flex">
          <div className="relative">
            <div
              className={cx(
                'fixed top-0 right-0 bottom-0 left-0 z-10 bg-gray-900 flex-row flex-none space-y-2 sm:sticky sm:block sm:w-80 sm:mr-10  overflow-auto h-screen',
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
                <ul className="flex flex-col flex-grow mb-6">
                  <li>
                    <Controller
                      control={control}
                      name="preset"
                      render={({ field: { value, onChange } }) => (
                        <label
                          htmlFor="preset-all"
                          className={cx(
                            'flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800',
                            {
                              'bg-gray-800': equals(PresetNftFilter.All, value),
                            }
                          )}
                        >
                          <input
                            onChange={onChange}
                            className="hidden"
                            type="radio"
                            name="preset"
                            value={PresetNftFilter.All}
                            id="preset-all"
                          />
                          All
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
                            'flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800',
                            {
                              'bg-gray-800': equals(
                                PresetNftFilter.Listed,
                                value
                              ),
                            }
                          )}
                        >
                          <input
                            onChange={onChange}
                            className="hidden"
                            type="radio"
                            name="preset"
                            value={PresetNftFilter.Listed}
                            id="preset-listed"
                          />
                          Listed for sale
                        </label>
                      )}
                    />
                  </li>
                  {connected && (
                    <li>
                      <Controller
                        control={control}
                        name="preset"
                        render={({ field: { value, onChange } }) => (
                          <label
                            htmlFor="preset-owned"
                            className={cx(
                              'flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800',
                              {
                                'bg-gray-800': equals(
                                  PresetNftFilter.Owned,
                                  value
                                ),
                              }
                            )}
                          >
                            <input
                              onChange={onChange}
                              className="hidden"
                              type="radio"
                              name="preset"
                              value={PresetNftFilter.Owned}
                              id="preset-owned"
                            />
                            Owned by me
                          </label>
                        )}
                      />
                    </li>
                  )}
                </ul>
              </form>
            </div>
          </div>
          <div className="grow">
            <List
              data={data?.nfts}
              loading={loading}
              loadingComponent={<NftCard.Skeleton />}
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
                    <a>
                      <NftCard nft={nft} marketplace={marketplace} />
                    </a>
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
