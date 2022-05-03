import { gql, useQuery } from '@apollo/client'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import cx from 'classnames'
import { NextPage, NextPageContext } from 'next'
import { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import {
  all,
  always,
  and,
  when,
  any,
  concat,
  equals,
  filter,
  find,
  ifElse,
  intersection,
  isEmpty,
  isNil,
  length,
  map,
  not,
  or,
  pipe,
  prop,
} from 'ramda'
import { DollarSign, Tag } from 'react-feather'
import { useForm } from 'react-hook-form'
import { Link, Route, Routes } from 'react-router-dom'
import { toast } from 'react-toastify'
import ActivityWallets from '../../components/ActivityWallets'
import { format } from 'timeago.js'
import client from '../../client'
import AcceptOfferForm from '../../components/AcceptOfferForm'
import Button, { ButtonType } from '../../components/Button'
import CancelOfferForm from '../../components/CancelOfferForm'
import OfferPage from '../../components/Offer'
import SellNftPage from '../../components/SellNft'
import WalletPortal from '../../components/WalletPortal'
import { useLogin } from '../../hooks/login'
import { truncateAddress, addressAvatar } from '../../modules/address'
import { toSOL } from '../../modules/lamports'
import { Activity, Listing, Marketplace, Nft, Offer } from '../../types.d'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

const {
  createPublicBuyInstruction,
  createExecuteSaleInstruction,
  createCancelInstruction,
  createPrintBidReceiptInstruction,
  createCancelListingReceiptInstruction,
  createPrintPurchaseReceiptInstruction,
} = AuctionHouseProgram.instructions

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
        wallets
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

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain']

  const {
    data: { marketplace, nft },
  } = await client.query<GetNftPage>({
    fetchPolicy: 'no-cache',
    query: gql`
      query GetNftPage($subdomain: String!, $address: String!) {
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
        nft(address: $address) {
          address
          image
          name
          description
          creators {
            address
          }
        }
      }
    `,
    variables: {
      subdomain: subdomain || SUBDOMAIN,
      address: query?.address,
    },
  })

  const nftCreatorAddresses = map(prop('address'))(nft?.creators || [])
  const marketplaceCreatorAddresses = map(prop('creatorAddress'))(
    marketplace?.creators || []
  )
  const notAllowed = pipe(
    intersection(marketplaceCreatorAddresses),
    isEmpty
  )(nftCreatorAddresses)

  if (or(any(isNil)([marketplace, nft]), notAllowed)) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      marketplace,
      nft,
    },
  }
}

interface GetNftPage {
  marketplace: Marketplace | null
  nft: Nft | null
}

interface NftPageProps extends AppProps {
  marketplace: Marketplace
  nft: Nft
}

interface GetNftData {
  nft: Nft
}

const NftShow: NextPage<NftPageProps> = ({ marketplace, nft }) => {
  const { publicKey, signTransaction, connected, connecting } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()
  const cancelListingForm = useForm()
  const buyNowForm = useForm()

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

  const buyNftTransaction = async () => {
    if (!publicKey || !signTransaction) {
      login()
      return
    }

    if (!listing || isOwner || !data) {
      return
    }

    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(
      marketplace.auctionHouse.auctionHouseFeeAccount
    )
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint)
    const seller = new PublicKey(listing.seller)
    const tokenMint = new PublicKey(data?.nft.mintAddress)
    const auctionHouseTreasury = new PublicKey(
      marketplace.auctionHouse.auctionHouseTreasury
    )
    const listingReceipt = new PublicKey(listing.address)
    const sellerPaymentReceiptAccount = new PublicKey(listing.seller)
    const sellerTradeState = new PublicKey(listing.tradeState)
    const buyerPrice = listing.price.toNumber()
    const tokenAccount = new PublicKey(
      data?.nft.owner.associatedTokenAccountAddress
    )

    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const [escrowPaymentAccount, escrowPaymentBump] =
      await AuctionHouseProgram.findEscrowPaymentAccountAddress(
        auctionHouse,
        publicKey
      )

    const [buyerTradeState, tradeStateBump] =
      await AuctionHouseProgram.findPublicBidTradeStateAddress(
        publicKey,
        auctionHouse,
        treasuryMint,
        tokenMint,
        buyerPrice,
        1
      )
    const [freeTradeState, freeTradeStateBump] =
      await AuctionHouseProgram.findTradeStateAddress(
        seller,
        auctionHouse,
        tokenAccount,
        treasuryMint,
        tokenMint,
        0,
        1
      )
    const [programAsSigner, programAsSignerBump] =
      await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()
    const [buyerReceiptTokenAccount] =
      await AuctionHouseProgram.findAssociatedTokenAccountAddress(
        tokenMint,
        publicKey
      )

    const [bidReceipt, bidReceiptBump] =
      await AuctionHouseProgram.findBidReceiptAddress(buyerTradeState)
    const [purchaseReceipt, purchaseReceiptBump] =
      await AuctionHouseProgram.findPurchaseReceiptAddress(
        sellerTradeState,
        buyerTradeState
      )

    const publicBuyInstructionAccounts = {
      wallet: publicKey,
      paymentAccount: publicKey,
      transferAuthority: publicKey,
      treasuryMint,
      tokenAccount,
      metadata,
      escrowPaymentAccount,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      buyerTradeState,
    }
    const publicBuyInstructionArgs = {
      tradeStateBump,
      escrowPaymentBump,
      buyerPrice,
      tokenSize: 1,
    }

    const executeSaleInstructionAccounts = {
      buyer: publicKey,
      seller,
      tokenAccount,
      tokenMint,
      metadata,
      treasuryMint,
      escrowPaymentAccount,
      sellerPaymentReceiptAccount,
      buyerReceiptTokenAccount,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      auctionHouseTreasury,
      buyerTradeState,
      sellerTradeState,
      freeTradeState,
      programAsSigner,
    }

    const executeSaleInstructionArgs = {
      escrowPaymentBump,
      freeTradeStateBump,
      programAsSignerBump,
      buyerPrice,
      tokenSize: 1,
    }

    const printBidReceiptAccounts = {
      bookkeeper: publicKey,
      receipt: bidReceipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }
    const printBidReceiptArgs = {
      receiptBump: bidReceiptBump,
    }

    const printPurchaseReceiptAccounts = {
      bookkeeper: publicKey,
      purchaseReceipt,
      bidReceipt,
      listingReceipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }
    const printPurchaseReceiptArgs = {
      purchaseReceiptBump,
    }

    const publicBuyInstruction = createPublicBuyInstruction(
      publicBuyInstructionAccounts,
      publicBuyInstructionArgs
    )
    const printBidReceiptInstruction = createPrintBidReceiptInstruction(
      printBidReceiptAccounts,
      printBidReceiptArgs
    )
    const executeSaleInstruction = createExecuteSaleInstruction(
      executeSaleInstructionAccounts,
      executeSaleInstructionArgs
    )
    const printPurchaseReceiptInstruction =
      createPrintPurchaseReceiptInstruction(
        printPurchaseReceiptAccounts,
        printPurchaseReceiptArgs
      )

    const txt = new Transaction()

    txt
      .add(publicBuyInstruction)
      .add(printBidReceiptInstruction)
      .add(
        new TransactionInstruction({
          programId: AuctionHouseProgram.PUBKEY,
          data: executeSaleInstruction.data,
          keys: concat(
            executeSaleInstruction.keys,
            data?.nft.creators.map((creator) => ({
              pubkey: new PublicKey(creator.address),
              isSigner: false,
              isWritable: true,
            }))
          ),
        })
      )
      .add(printPurchaseReceiptInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction | undefined = undefined

    try {
      signed = await signTransaction(txt)
    } catch (e: any) {
      toast.error(e.message)
      return
    }

    let signature: string | undefined = undefined

    try {
      toast('Sending the transaction to Solana.')

      signature = await connection.sendRawTransaction(signed.serialize())

      await connection.confirmTransaction(signature, 'confirmed')

      await refetch()

      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const cancelListingTransaction = async () => {
    if (!publicKey || !signTransaction) {
      login()
      return
    }

    if (!listing || !isOwner || !data) {
      return
    }

    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(
      marketplace.auctionHouse.auctionHouseFeeAccount
    )
    const tokenMint = new PublicKey(data?.nft.mintAddress)
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint)
    const receipt = new PublicKey(listing.address)
    const tokenAccount = new PublicKey(
      data?.nft.owner.associatedTokenAccountAddress
    )

    const buyerPrice = listing.price.toNumber()

    const [tradeState] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      tokenAccount,
      treasuryMint,
      tokenMint,
      buyerPrice,
      1
    )

    const cancelInstructionAccounts = {
      wallet: publicKey,
      tokenAccount,
      tokenMint,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      tradeState,
    }
    const cancelInstructionArgs = {
      buyerPrice,
      tokenSize: 1,
    }

    const cancelListingReceiptAccounts = {
      receipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const cancelInstruction = createCancelInstruction(
      cancelInstructionAccounts,
      cancelInstructionArgs
    )
    const cancelListingReceiptInstruction =
      createCancelListingReceiptInstruction(cancelListingReceiptAccounts)

    const txt = new Transaction()

    txt.add(cancelInstruction).add(cancelListingReceiptInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction | undefined = undefined

    try {
      signed = await signTransaction(txt)
    } catch (e: any) {
      toast.error(e.message)
      return
    }

    let signature: string | undefined = undefined

    try {
      toast('Sending the transaction to Solana.')

      signature = await connection.sendRawTransaction(signed.serialize())

      await connection.confirmTransaction(signature, 'confirmed')

      await refetch()

      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <>
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
      <div className="sticky top-0 z-10 flex items-center justify-between p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
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
                <Routes>
                  <Route
                    path={`/nfts/${data?.nft.address}`}
                    element={
                      <>
                        {!isOwner && !offer && (
                          <Link
                            to={`/nfts/${data?.nft.address}/offers/new`}
                            className="flex-1"
                          >
                            <Button type={ButtonType.Secondary} block>
                              Make Offer
                            </Button>
                          </Link>
                        )}
                        {isOwner && !listing && (
                          <Link
                            to={`/nfts/${data?.nft.address}/listings/new`}
                            className="flex-1"
                          >
                            <Button block>Sell NFT</Button>
                          </Link>
                        )}
                        {listing && !isOwner && (
                          <form
                            className="flex-1"
                            onSubmit={buyNowForm.handleSubmit(
                              buyNftTransaction
                            )}
                          >
                            <Button
                              loading={buyNowForm.formState.isSubmitting}
                              htmlType="submit"
                              block
                            >
                              Buy Now
                            </Button>
                          </form>
                        )}
                        {listing && isOwner && (
                          <form
                            className="flex-1"
                            onSubmit={cancelListingForm.handleSubmit(
                              cancelListingTransaction
                            )}
                          >
                            <Button
                              block
                              loading={cancelListingForm.formState.isSubmitting}
                              htmlType="submit"
                              type={ButtonType.Secondary}
                            >
                              Cancel Listing
                            </Button>
                          </form>
                        )}
                      </>
                    }
                  />
                  <Route
                    path={`/nfts/${data?.nft.address}/offers/new`}
                    element={
                      <OfferPage
                        nft={data?.nft}
                        marketplace={marketplace}
                        refetch={refetch}
                      />
                    }
                  />
                  <Route
                    path={`/nfts/${data?.nft.address}/listings/new`}
                    element={
                      <SellNftPage
                        nft={data?.nft}
                        marketplace={marketplace}
                        refetch={refetch}
                      />
                    }
                  />
                </Routes>
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
                      return (
                        <article
                          key={a.address}
                          className="grid grid-cols-4 p-4 mb-4 border border-gray-700 rounded"
                        >
                          <div className="flex self-center">
                            {a.activityType === 'purchase' ? (
                              <DollarSign
                                className="self-center mr-2 text-gray-300"
                                size="18"
                              />
                            ) : (
                              <Tag
                                className="self-center mr-2 text-gray-300"
                                size="18"
                              />
                            )}
                            <div>
                              {a.activityType === 'purchase'
                                ? 'Sold'
                                : 'Listed'}
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
    </>
  )
}

export default NftShow
