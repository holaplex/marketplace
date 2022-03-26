import { useEffect, useState } from 'react'
import { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'
import Head from 'next/head'
import { useWallet } from '@solana/wallet-adapter-react'
import WalletPortal from '../../components/WalletPortal'
import {
  isNil,
  map,
  modify,
  filter,
  partial,
  pipe,
  prop,
  or,
  indexOf,
  isEmpty,
  not,
  any,
  equals,
  ifElse,
  always,
  when,
  length,
} from 'ramda'
import { useRouter } from 'next/router'
import { AppProps } from 'next/app'
import Select from 'react-select'
import { useForm, Controller } from 'react-hook-form'
import {
  truncateAddress,
  collectionNameByAddress,
  collectionDescriptionByAddress,
} from '../../modules/address'
import client from '../../client'
import {
  Marketplace,
  Creator,
  Nft,
  PresetNftFilter,
  AttributeFilter,
  MarketplaceCreator,
} from '../../types.d'
import { List } from '../../components/List'
import { NftCard } from '../../components/NftCard'
import Button, { ButtonSize } from '../../components/Button'
import cx from 'classnames'
import { useSidebar } from '../../hooks/sidebar'
import { Filter } from 'react-feather'

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
    $listed: [PublicKey!]
    $limit: Int!
    $offset: Int!
    $attributes: [AttributeFilter!]
  ) {
    nfts(
      creators: $creators
      owners: $owners
      listed: $listed
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

const GET_SIDEBAR = gql`
  query GetCollectionSidebar($creator: String!) {
    creator(address: $creator) {
      address
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
      creator: query.collection,
    },
  })

  if (
    or(
      any(isNil)([marketplace, creator]),
      creator?.address == '4cUyDakNPeMEZtJPDJGNujWLGF1XNH7WbQnheUEfD2xX',
      pipe(
        map(prop('creatorAddress')),
        indexOf(query.collection),
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

interface GetCollectionSidebarData {
  creator: Creator
}

interface CollectionPageProps extends AppProps {
  marketplace: Marketplace
  creator: Creator
}

interface NftFilterForm {
  attributes: AttributeFilter[]
  preset: PresetNftFilter
}

const CollectionShow: NextPage<CollectionPageProps> = ({
  marketplace,
  creator,
}) => {
  const { publicKey, connected } = useWallet()
  const [hasMore, setHasMore] = useState(true)
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
      creators: [router.query.collection],
      offset: 0,
      limit: 24,
    },
  })

  const { data: sidebar, loading: loadingSidebar } =
    useQuery<GetCollectionSidebarData>(GET_SIDEBAR, {
      variables: {
        creator: router.query.collection,
      },
    })

  const { sidebarOpen, toggleSidebar } = useSidebar()

  const { control, watch } = useForm<NftFilterForm>({
    defaultValues: { preset: PresetNftFilter.All },
  })

  const loading = loadingNfts || loadingSidebar

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

      const listed = ifElse(
        equals(PresetNftFilter.Listed),
        always([marketplace.auctionHouse.address]),
        always(null)
      )(preset as PresetNftFilter)

      refetch({
        creators: [router.query.collection],
        attributes: nextAttributes,
        owners,
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
    router.query.collection,
    creator,
  ])

  return (
    <div
      className={cx('flex flex-col items-center text-white bg-gray-900', {
        'overflow-hidden': sidebarOpen,
      })}
    >
      <Head>
        <title>
          {truncateAddress(router.query?.collection as string)} NFT Collection |{' '}
          {marketplace.name}
        </title>
        <link rel="icon" href={marketplace.logoUrl} />
      </Head>
      <div className="relative w-full">
        <Link to="/" className="absolute top-6 left-6">
          <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full align sm:px-4 sm:py-2 sm:h-14 hover:bg-gray-600">
            <img
              className="w-12 h-12 md:w-8 md:h-8 rounded-full aspect-square"
              src={marketplace.logoUrl}
            />
            <div className="hidden sm:block">{marketplace.name}</div>
          </button>
        </Link>
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
          className="object-cover w-full h-44 md:h-60 lg:h-80 xl:h-[20rem] 2xl:h-[28rem]"
        />
      </div>
      <div className="w-full max-w-[1800px] px-8">
        <div className="relative flex flex-col justify-between w-full mt-20 mb-20">
          <img
            src={marketplace.logoUrl}
            alt={marketplace.name}
            className="absolute border-4 bg-gray-900 object-cover border-gray-900 rounded-full w-28 h-28 -top-32"
          />
          <h2 className="text-sm text-gray-300">{marketplace.name}</h2>
          <h1 className="mb-4">
            {collectionNameByAddress(router.query?.collection)}
          </h1>
          <p>{collectionDescriptionByAddress(router.query?.collection)}</p>
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
                className="px-4 sm:px-0 py-4"
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
                <div className="flex flex-col flex-grow gap-4">
                  {loading ? (
                    <>
                      <div className="flex flex-col flex-grow gap-2">
                        <label className="block h-4 w-14 bg-gray-800 rounded" />
                        <div className="block h-10 w-full bg-gray-800 rounded" />
                      </div>
                      <div className="flex flex-col flex-grow gap-2">
                        <label className="block h-4 w-14 bg-gray-800 rounded" />
                        <div className="block h-10 w-full bg-gray-800 rounded" />
                      </div>
                      <div className="flex flex-col flex-grow gap-2">
                        <label className="block h-4 w-14 bg-gray-800 rounded" />
                        <div className="block h-10 w-full bg-gray-800 rounded" />
                      </div>
                      <div className="flex flex-col flex-grow gap-2">
                        <label className="block h-4 w-14 bg-gray-800 rounded" />
                        <div className="block h-10 w-full bg-gray-800 rounded" />
                      </div>
                    </>
                  ) : (
                    sidebar?.creator.attributeGroups.map(
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
                  <p className="mt- text-gray-500">
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

export default CollectionShow
