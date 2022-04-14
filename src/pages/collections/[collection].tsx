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
  howrareisJSONByAddress,
  moonrankJSONByAddress,
} from '../../modules/address'
import client from '../../client'
import {
  Marketplace,
  Creator,
  Nft,
  PresetNftFilter,
  AttributeFilter,
} from '../../types.d'
import { List } from '../../components/List'
import { NftCard } from '../../components/NftCard'
import Button, { ButtonSize } from '../../components/Button'
import cx from 'classnames'
import { useSidebar } from '../../hooks/sidebar'
import { Filter } from 'react-feather'
import { toSOL } from '../../modules/lamports'
import { ADDRESSES } from './../../utils/utilities'
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
    $offerers: [PublicKey!]
    $limit: Int!
    $offset: Int!
    $attributes: [AttributeFilter!]
  ) {
    nfts(
      creators: $creators
      owners: $owners
      listed: $listed
      offerers: $offerers
      limit: $limit
      offset: $offset
      attributes: $attributes
    ) {
      address
      mintAddress
      name
      description
      image
      owner {
        address
        associatedTokenAccountAddress
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
        mint
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
      creator?.address == ADDRESSES.DUPLICATE_COLLECTION,
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

interface GetCollectionInfo {
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

  const collectionQuery = useQuery<GetCollectionInfo>(GET_COLLECTION_INFO, {
    variables: {
      creator: router.query.collection,
      auctionHouses: [marketplace.auctionHouse.address],
    },
  })

  const { sidebarOpen, toggleSidebar } = useSidebar()

  const { control, watch } = useForm<NftFilterForm>({
    defaultValues: { preset: PresetNftFilter.All },
  })

  const loading = loadingNfts || collectionQuery.loading

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
        always([marketplace.auctionHouse.address]),
        always(null)
      )(preset as PresetNftFilter)

      refetch({
        creators: [router.query.collection],
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
    router.query.collection,
    creator,
  ])

  const moonrank = moonrankJSONByAddress(router.query?.collection)
  const howrareis = howrareisJSONByAddress(router.query?.collection)

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
        <link rel="stylesheet" href="https://use.typekit.net/nxe8kpf.css" />
        <meta property="og:site_name" content={marketplace.name} />
        <meta
          property="og:title"
          content={
            truncateAddress(router.query?.collection as string) +
            ' NFT Collection ' +
            ' | ' +
            marketplace.name
          }
        />
        <meta property="og:image" content={marketplace.bannerUrl} />
        <meta property="og:description" content={marketplace.description} />
      </Head>
      <div className="relative w-full">
        <Link to="/" className="absolute top-6 left-6">
          <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full align sm:px-4 sm:py-2 sm:h-14 hover:bg-gray-600 transition-transform hover:scale-[1.02]">
            <img
              className="object-cover w-12 h-12 rounded-full md:w-8 md:h-8 aspect-square"
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
                className="mr-6 text-sm cursor-pointer hover:underline"
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
          className="object-cover w-full h-44 md:h-60"
        />
      </div>
      <div className="w-full max-w-[1800px] px-4 sm:px-8">
        <div className="relative grid justify-between w-full grid-cols-12 gap-4 mt-20 mb-10">
          <div className="col-span-12 mb-6 md:col-span-8">
            <img
              src={marketplace.logoUrl}
              alt={marketplace.name}
              className="absolute object-cover bg-gray-900 border-4 border-gray-900 rounded-full w-28 h-28 -top-32"
            />
            <h2 className="text-xl text-gray-300">{marketplace.name}</h2>
            <h1 className="mb-4">
              {collectionNameByAddress(router.query?.collection)}
            </h1>
            <p>{collectionDescriptionByAddress(router.query?.collection)}</p>
          </div>
          <div className="grid grid-cols-2 col-span-12 gap-4 md:col-span-4">
            <div>
              <span className="block w-full mb-2 text-sm font-semibold text-gray-300 uppercase">
                Floor
              </span>
              {loading ? (
                <div className="block w-20 h-6 bg-gray-800 rounded" />
              ) : (
                <span className="text-xl sol-amount">
                  {toSOL(
                    ifElse(isEmpty, always(0), (stats) =>
                      stats[0].floor.toNumber()
                    )(collectionQuery.data?.creator.stats) as number
                  )}
                </span>
              )}
            </div>
            <div>
              <span className="block w-full mb-2 text-sm font-semibold text-gray-300 uppercase">
                Vol Last 24 hrs
              </span>
              {loading ? (
                <div className="block w-20 h-6 bg-gray-800 rounded" />
              ) : (
                <span className="text-xl sol-amount">
                  {toSOL(
                    ifElse(isEmpty, always(0), (stats) =>
                      stats[0].volume24hr.toNumber()
                    )(collectionQuery.data?.creator.stats) as number
                  )}
                </span>
              )}
            </div>
            <div>
              <span className="block w-full mb-2 text-sm font-semibold text-gray-300 uppercase">
                Avg Sale Price
              </span>
              {loading ? (
                <div className="block w-16 h-6 bg-gray-800 rounded" />
              ) : (
                <span className="text-xl sol-amount">
                  {toSOL(
                    ifElse(isEmpty, always(0), (stats) =>
                      stats[0].average.toNumber()
                    )(collectionQuery.data?.creator.stats) as number
                  )}
                </span>
              )}
            </div>
            <div>
              <span className="block w-full mb-2 text-sm font-semibold text-gray-300 uppercase">
                NFTs
              </span>
              {loading ? (
                <div className="block w-24 h-6 bg-gray-800 rounded" />
              ) : (
                <span className="text-xl">
                  {collectionQuery.data?.creator.counts?.creations || 0}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex">
          <div className="relative">
            <div
              className={cx(
                'fixed top-0 right-0 bottom-0 left-0 z-10 bg-gray-900 flex-row flex-none space-y-2 md:sticky md:block md:w-80 md:mr-10 overflow-auto h-screen',
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
                <ul className="flex flex-col flex-grow gap-2 mb-6">
                  <li>
                    <Controller
                      control={control}
                      name="preset"
                      render={({ field: { value, onChange } }) => (
                        <label
                          htmlFor="preset-all"
                          className={cx(
                            'flex justify-between w-full px-4 py-2 rounded-md cursor-pointer hover:bg-gray-800',
                            {
                              'bg-gray-800': or(
                                equals(PresetNftFilter.All, value),
                                loading
                              ),
                            }
                          )}
                        >
                          <input
                            onChange={onChange}
                            className="hidden"
                            disabled={loading}
                            type="radio"
                            name="preset"
                            value={PresetNftFilter.All}
                            id="preset-all"
                          />
                          {loading ? <div className="w-full h-6" /> : 'All'}
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
                            'flex justify-between w-full px-4 py-2 rounded-md cursor-pointer hover:bg-gray-800',
                            {
                              'bg-gray-800': or(
                                equals(PresetNftFilter.Listed, value),
                                loading
                              ),
                            }
                          )}
                        >
                          <input
                            onChange={onChange}
                            className="hidden"
                            disabled={loading}
                            type="radio"
                            name="preset"
                            value={PresetNftFilter.Listed}
                            id="preset-listed"
                          />
                          {loading ? (
                            <div className="w-full h-6" />
                          ) : (
                            'Listed for sale'
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
                                'flex justify-between w-full px-4 py-2 rounded-md cursor-pointer hover:bg-gray-800',
                                {
                                  'bg-gray-800': or(
                                    equals(PresetNftFilter.Owned, value),
                                    loading
                                  ),
                                }
                              )}
                            >
                              <input
                                onChange={onChange}
                                className="hidden"
                                type="radio"
                                disabled={loading}
                                name="preset"
                                value={PresetNftFilter.Owned}
                                id="preset-owned"
                              />
                              {loading ? (
                                <div className="w-full h-6" />
                              ) : (
                                'Owned by me'
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
                                'flex justify-between w-full px-4 py-2 rounded-md cursor-pointer hover:bg-gray-800',
                                {
                                  'bg-gray-800': or(
                                    equals(PresetNftFilter.OpenOffers, value),
                                    loading
                                  ),
                                }
                              )}
                            >
                              <input
                                onChange={onChange}
                                className="hidden"
                                type="radio"
                                disabled={loading}
                                name="preset"
                                value={PresetNftFilter.OpenOffers}
                                id="preset-open"
                              />
                              {loading ? (
                                <div className="w-full h-6" />
                              ) : (
                                'My open offers'
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
                  <Link to={`/nfts/${nft.address}`} key={nft.address}>
                    <NftCard
                      nft={nft}
                      marketplace={marketplace}
                      moonrank={
                        (moonrank && moonrank[nft.mintAddress]) || undefined
                      }
                      howrareis={
                        (howrareis && howrareis[nft.mintAddress]) || undefined
                      }
                    />
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
        className="fixed z-10 bottom-4 md:hidden"
        onClick={toggleSidebar}
      >
        Filter
      </Button>
    </div>
  )
}

export default CollectionShow
