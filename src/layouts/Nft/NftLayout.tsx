import React, { ReactElement } from 'react'
import { gql, useQuery } from '@apollo/client'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import cx from 'classnames'
import Head from 'next/head'
import { useRouter } from 'next/router'
import {
  all,
  always,
  and,
  when,
  any,
  equals,
  filter,
  find,
  ifElse,
  isNil,
  length,
  gt,
  not,
  pipe,
  prop,
} from 'ramda'
import { PublicKey } from '@solana/web3.js'
import { DollarSign, Tag } from 'react-feather'
import { format } from 'timeago.js'
import AcceptOfferForm from '../../components/AcceptOfferForm'
import CancelOfferForm from '../../components/CancelOfferForm'
import { BasicLayout } from '../Basic'
import { useLogin } from '../../hooks/login'
import { truncateAddress, addressAvatar } from '../../modules/address'
import { toSOL } from '../../modules/lamports'
import { Activity, Listing, Marketplace, Nft, Offer } from '../../types'

const moreThanOne = pipe(length, (len) => gt(len, 1))
const pickAuctionHouse = prop('auctionHouse')

const GET_NFT = gql`
  query GetNft($address: String!) {
    nft(address: $address) {
      name
      address
      image(width: 1400)
      sellerFeeBasisPoints
      mintAddress
      description
      primarySaleHappened
      category
      files {
        fileType
        uri
      }
      owner {
        address
        associatedTokenAccountAddress
        twitterHandle
        profile {
          handle
          profileImageUrl
        }
      }
      attributes {
        traitType
        value
      }
      creators {
        address
        twitterHandle
        profile {
          handle
          profileImageUrl
        }
      }
      offers {
        address
        tradeState
        price
        buyer
        createdAt
        auctionHouse
      }
      activities {
        address
        metadata
        auctionHouse
        price
        createdAt
        wallets {
          address
          profile {
            handle
            profileImageUrl
          }
        }
        activityType
      }
      listings {
        address
        auctionHouse
        bookkeeper
        seller
        metadata
        purchaseReceipt
        price
        tokenSize
        bump
        tradeState
        tradeStateBump
        createdAt
        canceledAt
      }
    }
  }
`

interface NftLayoutProps {
  marketplace: Marketplace
  nft: Nft
  children: ReactElement
}

interface GetNftData {
  nft: Nft
}

export const NftLayout = ({ marketplace, nft, children }: NftLayoutProps) => {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()

  const { data, loading, refetch } = useQuery<GetNftData>(GET_NFT, {
    variables: {
      address: router.query?.address,
    },
  })

  const isMarketplaceAuctionHouse = equals(marketplace.auctionHouse.address)
  const isOwner = equals(data?.nft.owner.address, publicKey?.toBase58()) || null
  const login = useLogin()
  const listing = find<Listing>(
    pipe(pickAuctionHouse, isMarketplaceAuctionHouse)
  )(data?.nft.listings || [])
  const offers = filter<Offer>(
    pipe(pickAuctionHouse, isMarketplaceAuctionHouse)
  )(data?.nft.offers || [])
  const offer = find<Offer>(pipe(prop('buyer'), equals(publicKey?.toBase58())))(
    data?.nft.offers || []
  )
  let activities = filter<Activity>(
    pipe(pickAuctionHouse, isMarketplaceAuctionHouse)
  )(data?.nft.activities || [])

  return (
    <BasicLayout marketplace={marketplace}>
      <Head>
        <title>
          {truncateAddress(router.query?.address as string)} NFT |{' '}
          {marketplace.name}
        </title>
        <link rel="icon" href={marketplace.logoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={marketplace.name} />
        <meta
          property="og:title"
          content={`${nft.name} | ${marketplace.name}`}
        />
        <meta property="og:image" content={nft.image} />
        <meta property="og:description" content={nft.description} />
      </Head>
      <div className="container px-4 pb-10 mx-auto text-white">
        <div className="grid items-start grid-cols-1 gap-6 mt-12 mb-10 lg:grid-cols-2">
          <div className="block mb-4 lg:mb-0 lg:flex lg:items-center lg:justify-center ">
            <div className="block mb-6 lg:hidden">
              {loading ? (
                <div className="w-full h-32 bg-gray-800 rounded-lg" />
              ) : (
                <>
                  <h1 className="mb-4 text-2xl">{data?.nft.name}</h1>
                  <p className="text-lg">{data?.nft.description}</p>
                </>
              )}
            </div>
            {loading ? (
              <div className="w-full bg-gray-800 border-none rounded-lg aspect-square" />
            ) : data?.nft.category === 'video' ||
              data?.nft.category === 'audio' ? (
              <video
                className=""
                playsInline={true}
                autoPlay={true}
                muted={true}
                controls={true}
                controlsList="nodownload"
                loop={true}
                poster={data?.nft.image}
                src={data?.nft.files.at(-1)?.uri}
              ></video>
            ) : data?.nft.category === 'image' ? (
              <img
                src={data?.nft.image}
                className="block w-full h-auto border-none rounded-lg shadow"
              />
            ) : (
              <></>
            )}
          </div>
          <div>
            <div className="hidden mb-8 lg:block">
              {loading ? (
                <div className="w-full h-32 bg-gray-800 rounded-lg" />
              ) : (
                <>
                  <h1 className="mb-4 text-2xl lg:text-4xl md:text-3xl">
                    {data?.nft.name}
                  </h1>
                  <p className="text-lg">{data?.nft.description}</p>
                </>
              )}
            </div>
            <div className="flex justify-between mb-8">
              <div>
                <div className="mb-1 label">
                  {loading ? (
                    <div className="h-4 bg-gray-800 rounded w-14" />
                  ) : (
                    <span className="text-sm text-gray-300">Created by</span>
                  )}
                </div>
                <div className="flex ml-1.5">
                  {loading ? (
                    <div className="w-20 h-6 bg-gray-800 rounded -ml-1.5" />
                  ) : (
                    data?.nft.creators.map((creator) => (
                      <div key={creator.address} className="-ml-1.5">
                        <a
                          href={`https://holaplex.com/profiles/${creator.address}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <img
                            className="rounded-full h-6 w-6 object-cover border-2 border-gray-900 transition-transform hover:scale-[1.5]"
                            src={
                              when(
                                isNil,
                                always(
                                  addressAvatar(new PublicKey(creator.address))
                                )
                              )(creator.profile?.profileImageUrl) as string
                            }
                          />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                {data?.nft.primarySaleHappened && (
                  <>
                    <div className="flex justify-end mb-1 label">
                      {loading ? (
                        <div className="h-4 bg-gray-800 rounded w-14" />
                      ) : (
                        <span className="text-sm text-gray-300">
                          Collected by
                        </span>
                      )}
                    </div>
                    <div className="flex justify-end">
                      {loading ? (
                        <div className="w-20 h-6 bg-gray-800 rounded" />
                      ) : (
                        <a
                          href={`https://holaplex.com/profiles/${data?.nft.owner.address}`}
                          rel="noreferrer"
                          target="_blank"
                          className="flex gap-1 items-center transition-transform hover:scale-[1.2]"
                        >
                          <img
                            className="object-cover w-6 h-6 border-2 border-gray-900 rounded-full user-avatar"
                            src={
                              when(
                                isNil,
                                always(
                                  addressAvatar(
                                    new PublicKey(data?.nft.owner.address)
                                  )
                                )
                              )(
                                data?.nft.owner.profile?.profileImageUrl
                              ) as string
                            }
                          />

                          {data.nft.owner?.twitterHandle
                            ? `@${data.nft.owner.twitterHandle}`
                            : truncateAddress(data?.nft.owner.address)}
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div
              className={cx('w-full p-6 mt-8 bg-gray-800 rounded-lg', {
                'h-44': loading,
              })}
            >
              <div
                className={cx('flex', {
                  hidden: loading,
                })}
              >
                {listing && (
                  <div className="flex-1 mb-6">
                    <div className="label">PRICE</div>
                    <p className="text-base md:text-xl lg:text-3xl">
                      <b className="sol-amount">
                        {toSOL(listing.price.toNumber())}
                      </b>
                    </p>
                  </div>
                )}
              </div>
              <div className={cx('flex gap-4', { hidden: loading })}>
                {React.cloneElement(children, {
                  ...children.props,
                  isOwner,
                  listing,
                  offer,
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-8">
              {loading ? (
                <>
                  <div className="h-16 bg-gray-800 rounded" />
                  <div className="h-16 bg-gray-800 rounded" />
                  <div className="h-16 bg-gray-800 rounded" />
                  <div className="h-16 bg-gray-800 rounded" />
                </>
              ) : (
                data?.nft.attributes.map((a) => (
                  <div
                    key={a.traitType}
                    className="p-3 border border-gray-700 rounded"
                  >
                    <p className="uppercase label">{a.traitType}</p>
                    <p className="truncate text-ellipsis" title={a.value}>
                      {a.value}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-10 mb-10 text-sm sm:text-base md:text-lg ">
          <div className="w-full">
            <h2 className="mb-4 text-xl md:text-2xl text-bold">Offers</h2>
            {ifElse(
              (offers: Offer[]) =>
                and(pipe(length, equals(0))(offers), not(loading)),
              always(
                <div className="w-full p-10 text-center border border-gray-800 rounded-lg">
                  <h3>No offers found</h3>
                  <p className="text-gray-500 mt-">
                    There are currently no offers on this NFT.
                  </p>
                </div>
              ),
              (offers: Offer[]) => (
                <section className="w-full">
                  <header
                    className={cx(
                      'grid px-4 mb-2',
                      ifElse(
                        all(isNil),
                        always('grid-cols-3'),
                        always('grid-cols-4')
                      )([offer, isOwner])
                    )}
                  >
                    <span className="label">FROM</span>
                    <span className="label">PRICE</span>
                    <span className="label">WHEN</span>
                    {any(pipe(isNil, not))([offer, isOwner]) && (
                      <span className="label"></span>
                    )}
                  </header>
                  {loading ? (
                    <>
                      <article className="h-16 mb-4 bg-gray-800 rounded" />
                      <article className="h-16 mb-4 bg-gray-800 rounded" />
                      <article className="h-16 mb-4 bg-gray-800 rounded" />
                    </>
                  ) : (
                    offers.map((o: Offer) => (
                      <article
                        key={o.address}
                        className={cx(
                          'grid p-4 mb-4 border border-gray-700 rounded',
                          ifElse(
                            all(isNil),
                            always('grid-cols-3'),
                            always('grid-cols-4')
                          )([offer, isOwner])
                        )}
                      >
                        <div>
                          <a
                            href={`https://holaplex.com/profiles/${o.buyer}`}
                            rel="nofollower"
                          >
                            {truncateAddress(o.buyer)}
                          </a>
                        </div>
                        <div>
                          <span className="sol-amount">
                            {toSOL(o.price.toNumber())}
                          </span>
                        </div>
                        <div>{format(o.createdAt, 'en_US')}</div>
                        {(offer || isOwner) && (
                          <div className="flex justify-end w-full gap-2">
                            {equals(
                              o.buyer,
                              publicKey?.toBase58() as string
                            ) && (
                              <CancelOfferForm
                                nft={data?.nft}
                                marketplace={marketplace}
                                offer={o}
                                refetch={refetch}
                              />
                            )}
                            {isOwner && (
                              <AcceptOfferForm
                                nft={data?.nft}
                                marketplace={marketplace}
                                offer={o}
                                listing={listing}
                                refetch={refetch}
                              />
                            )}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </section>
              )
            )(offers)}

            <h2 className="mb-4 text-xl mt-14 md:text-2xl text-bold">
              Activity
            </h2>
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
                  <header className="grid grid-cols-4 px-4 mb-2">
                    <span className="label">EVENT</span>
                    <span className="label">WALLETS</span>
                    <span className="label">PRICE</span>
                    <span className="label">WHEN</span>
                  </header>
                  {loading ? (
                    <>
                      <article className="h-16 mb-4 bg-gray-800 rounded" />
                      <article className="h-16 mb-4 bg-gray-800 rounded" />
                      <article className="h-16 mb-4 bg-gray-800 rounded" />
                      <article className="h-16 mb-4 bg-gray-800 rounded" />
                    </>
                  ) : (
                    activities.map((a: Activity) => {
                      const hasWallets = moreThanOne(a.wallets)
                      return (
                        <article
                          key={a.address}
                          className="grid grid-cols-4 p-4 mb-4 border border-gray-700 rounded"
                        >
                          <div className="flex flex-col justify-center flex-start gap-1">
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
                                    className="rounded-full h-5 w-5 object-cover border-2 border-gray-900 "
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
        </div>
      </div>
    </BasicLayout>
  )
}
