import { NextPage, NextPageContext } from 'next'
import { AppProps } from 'next/app'
import { gql } from '@apollo/client'
import {
  isNil,
  pipe,
  ifElse,
  or,
  always,
  equals,
  length,
  find,
  prop,
  isEmpty,
  filter,
  and,
  not,
  concat,
  all,
  map,
  any,
  intersection,
} from 'ramda';
import Head from 'next/head';
import cx from 'classnames';
import client from '../../client';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import WalletPortal from '../../components/WalletPortal';
import Button, { ButtonType } from '../../components/Button';
import { Route, Routes } from 'react-router-dom'
import OfferPage from '../../components/Offer'
import SellNftPage from '../../components/SellNft'
import Avatar from '../../components/Avatar'
import { truncateAddress } from '../../modules/address'
import { Marketplace, Nft, Listing, Offer } from '../../types'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata'
import { format } from 'timeago.js'
import {
  Transaction,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js'
import { toSOL } from '../../modules/lamports'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import CancelOfferForm from '../../components/CancelOfferForm'
import AcceptOfferForm from '../../components/AcceptOfferForm'
import { useLogin } from '../../hooks/login';

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

const {
  createPublicBuyInstruction,
  createExecuteSaleInstruction,
  createCancelInstruction,
  createPrintBidReceiptInstruction,
  createCancelListingReceiptInstruction,
  createPrintPurchaseReceiptInstruction,
} = AuctionHouseProgram.instructions

const pickAuctionHouse = prop('auctionHouse');

const GET_NFT = gql`
  query GetNft($address: String!) {
    nft(address: $address) {
          name
          address
          image
          sellerFeeBasisPoints
          mintAddress
          description
          owner {
            address
          }
          attributes {
            traitType
            value
          }
          creators {
            address
          }
          offers {
            address
            tradeState
            price
            buyer
            createdAt
            auctionHouse
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
  const subdomain = req?.headers['x-holaplex-subdomain'];

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

  const nftCreatorAddresses = map(prop('address'))(nft?.creators || []);
  const marketplaceCreatorAddresses = map(prop('creatorAddress'))(marketplace?.creators || []);
  const notAllowed = pipe(intersection(marketplaceCreatorAddresses), isEmpty)( nftCreatorAddresses);
  
  if (or(any(isNil)([marketplace, nft]), notAllowed)) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      marketplace,
    },
  }
}

interface GetNftPage {
  marketplace: Marketplace | null;
  nft: Nft | null;
}

interface NftPageProps extends AppProps {
  marketplace: Marketplace
}

interface GetNftData {
  nft: Nft;
}

const NftShow: NextPage<NftPageProps> = ({ marketplace }) => {
  const { publicKey, signTransaction, connected, connecting } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const cancelListingForm = useForm();
  const buyNowForm = useForm();

  const { data, loading, refetch } = useQuery<GetNftData>(GET_NFT, {
    variables: {
      address: router.query?.address,
    },
  });

  const isMarketplaceAuctionHouse = equals(marketplace.auctionHouse.address);
  const isOwner = equals(data?.nft.owner.address, publicKey?.toBase58()) || null;
  const login = useLogin();
  const listing = find<Listing>(
    pipe(pickAuctionHouse, isMarketplaceAuctionHouse)
  )(data?.nft.listings || []);
  const offers = filter<Offer>(
    pipe(pickAuctionHouse, isMarketplaceAuctionHouse)
  )(data?.nft.offers || []);
  const offer = find<Offer>(
    pipe(prop('buyer'), equals(publicKey?.toBase58()))
  )(data?.nft.offers || []);

  const buyNftTransaction = async () => {
    if (!publicKey || !signTransaction || !listing || isOwner || !data) {
      return
    }

    const auctionHouse = new PublicKey(marketplace.auctionHouse.address);
    const authority = new PublicKey(marketplace.auctionHouse.authority);
    const auctionHouseFeeAccount = new PublicKey(
      marketplace.auctionHouse.auctionHouseFeeAccount
    );
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint);
    const seller = new PublicKey(listing.seller);
    const tokenMint = new PublicKey(data?.nft.mintAddress);
    const auctionHouseTreasury = new PublicKey(
      marketplace.auctionHouse.auctionHouseTreasury
    );
    const listingReceipt = new PublicKey(listing.address);
    const sellerPaymentReceiptAccount = new PublicKey(listing.seller);
    const sellerTradeState = new PublicKey(listing.tradeState);
    const buyerPrice = listing.price.toNumber();

    const [
      tokenAccount,
    ] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      tokenMint,
      new PublicKey(data?.nft.owner.address)
    )
    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const [
      escrowPaymentAccount,
      escrowPaymentBump,
    ] = await AuctionHouseProgram.findEscrowPaymentAccountAddress(
      auctionHouse,
      publicKey
    )

    const [
      buyerTradeState,
      tradeStateBump,
    ] = await AuctionHouseProgram.findPublicBidTradeStateAddress(
      publicKey,
      auctionHouse,
      treasuryMint,
      tokenMint,
      buyerPrice,
      1
    )
    const [
      freeTradeState,
      freeTradeStateBump,
    ] = await AuctionHouseProgram.findTradeStateAddress(
      seller,
      auctionHouse,
      tokenAccount,
      treasuryMint,
      tokenMint,
      0,
      1
    )
    const [
      programAsSigner,
      programAsSignerBump,
    ] = await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()
    const [
      buyerReceiptTokenAccount,
    ] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      tokenMint,
      publicKey
    )

    const [
      bidReceipt,
      bidReceiptBump,
    ] = await AuctionHouseProgram.findBidReceiptAddress(buyerTradeState)
    const [
      purchaseReceipt,
      purchaseReceiptBump,
    ] = await AuctionHouseProgram.findPurchaseReceiptAddress(
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
    const printPurchaseReceiptInstruction = createPrintPurchaseReceiptInstruction(
      printPurchaseReceiptAccounts,
      printPurchaseReceiptArgs
    )

    const txt = new Transaction();

    txt
      .add(publicBuyInstruction)
      .add(printBidReceiptInstruction)
      .add(new TransactionInstruction({
        programId: AuctionHouseProgram.PUBKEY,
        data: executeSaleInstruction.data,
        keys: concat(
          executeSaleInstruction.keys,
          data?.nft.creators.map(creator => ({ pubkey: new PublicKey(creator.address), isSigner: false, isWritable: true }))
        )
      }))
      .add(printPurchaseReceiptInstruction);

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    txt.feePayer = publicKey;

    let signed: Transaction | undefined = undefined;

    try {
      signed = await signTransaction(txt);
    } catch (e: any) {
      toast.error(e.message);
      return;
    }

    let signature: string | undefined = undefined;

    try {
      toast('Sending the transaction to Solana.');

      signature = await connection.sendRawTransaction(signed.serialize());

      await connection.confirmTransaction(signature, 'finalized');

      await refetch();

      toast.success('The transaction was confirmed.');
    } catch(e: any) {
      toast.error(e.message);
    }
  }

  const cancelListingTransaction = async () => {
    if (!publicKey || !signTransaction || !listing || !isOwner || !data) {
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
    const [
      tokenAccount,
    ] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      tokenMint,
      new PublicKey(data?.nft.owner.address)
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
    const cancelListingReceiptInstruction = createCancelListingReceiptInstruction(
      cancelListingReceiptAccounts
    )

    const txt = new Transaction()

    txt.add(cancelInstruction).add(cancelListingReceiptInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction | undefined = undefined;

    try {
      signed = await signTransaction(txt);
    } catch (e: any) {
      toast.error(e.message);
      return;
    }

    let signature: string | undefined = undefined;

    try {
      toast('Sending the transaction to Solana.');

      signature = await connection.sendRawTransaction(signed.serialize());

      await connection.confirmTransaction(signature, 'finalized');

      await refetch();

      toast.success('The transaction was confirmed.');
    } catch(e: any) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <Head>
        <title>
          {truncateAddress(router.query?.address as string)} NFT | {marketplace.name}
        </title>
        <link rel="icon" href={marketplace.logoUrl} />
      </Head>
      <div className='sticky top-0 z-10 flex items-center justify-between p-6 text-white bg-gray-900/80 backdrop-blur-md grow'>
        <Link to='/'>
          <a>
            <button className='flex items-center justify-between gap-2 px-4 py-2 bg-gray-800 rounded-full align h-14 hover:bg-gray-600'>
              <img
                className='w-8 h-8 rounded-full aspect-square'
                src={marketplace.logoUrl}
              />
              {marketplace.name}
            </button>
          </a>
        </Link>
        <div className="block">
          <WalletPortal />
        </div>
      </div>
      <div className='container px-4 pb-10 mx-auto text-white'>
        <div className='grid items-start grid-cols-1 gap-6 mt-12 mb-10 lg:grid-cols-2'>
          <div className='block mb-4 lg:mb-0 lg:flex lg:items-center lg:justify-center '>
            <div className='block mb-6 lg:hidden'>
              {loading ? (
                <div className="w-full h-32 bg-gray-800 rounded-lg" />
              ) : (
                <>
                  <h1 className='mb-4 text-2xl'>{data?.nft.name}</h1>
                  <p className='text-lg'>{data?.nft.description}</p>
                </>
              )}
            </div>
            {loading ? (
              <div className='w-full bg-gray-800 border-none rounded-lg aspect-square' />
            ) : (
              <img
                src={data?.nft.image}
                className='block h-auto max-w-full border-none rounded-lg shadow'
              />
            )}
          </div>
          <div>
            <div className='hidden mb-8 lg:block'>
              {loading ? (
                <div className="w-full h-32 bg-gray-800 rounded-lg" />
              ) : (
                <>
                  <h1 className='mb-4 text-2xl lg:text-4xl md:text-3xl'>{data?.nft.name}</h1>
                  <p className='text-lg'>{data?.nft.description}</p>
                </>
              )}
            </div>
            <div className='flex-1 mb-8'>
              <div className='mb-1 label'>
                {loading ? (
                  <div className="h-4 bg-gray-800 rounded w-14" />
                ) : (
                  ifElse(
                    pipe(length, equals(1)),
                    always('CREATOR'),
                    always('CREATORS')
                  )(data?.nft.creators || "")
                )}
              </div>
              <ul>
                {loading ? (
                  <li>
                    <div className="w-20 h-6 bg-gray-800 rounded" />
                  </li>
                ) : (
                  data?.nft.creators.map(({ address }) => (
                    <li key={address}>
                      <a
                        href={`https://holaplex.com/profiles/${address}`}
                        rel='noreferrer'
                        target='_blank'
                      >
                        <Avatar name={truncateAddress(address)} />
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className={
              cx(
                'w-full p-6 mt-8 bg-gray-800 rounded-lg',
                {
                  'h-44': loading,
                }
              )
            }>
              <div className={
                cx(
                  'flex',
                  {
                    'hidden': loading,
                  }
                )
              }>
                {listing && (
                  <div className='flex-1'>
                    <div className='label'>PRICE</div>
                    <p className='text-base md:text-xl lg:text-3xl'>
                      <b className='sol-amount'>{toSOL(listing.price.toNumber())}</b>
                    </p>
                  </div>
                )}
                <div className='flex-1'>
                  <div className='mb-1 label'>OWNER</div>
                  <a
                    href={`https://holaplex.com/profiles/${data?.nft.owner.address}`}
                    rel='noreferrer'
                    target='_blank'
                  >
                    <Avatar name={truncateAddress(data?.nft.owner.address || "")} />
                  </a>
                </div>
              </div>
              <div className={cx('flex gap-4', { hidden: loading })}>
                {connected ? (
                  <Routes>
                    <Route
                      path={`/nfts/${data?.nft.address}`}
                      element={
                        <>
                          {!isOwner && !offer && (
                            <Link
                              to={`/nfts/${data?.nft.address}/offers/new`}
                              className='flex-1 mt-6'
                            >
                              <Button type={ButtonType.Secondary} block>
                                Make Offer
                              </Button>
                            </Link>
                          )}
                          {isOwner && !listing && (
                            <Link
                              to={`/nfts/${data?.nft.address}/listings/new`}
                              className='flex-1 mt-6'
                            >
                              <Button block>
                                Sell NFT
                              </Button>
                            </Link>
                          )}
                          {listing && !isOwner && (
                            <form className='flex-1 mt-6' onSubmit={buyNowForm.handleSubmit(buyNftTransaction)}>
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
                            <form className="flex-1 mt-6" onSubmit={cancelListingForm.handleSubmit(cancelListingTransaction)}>
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
                      element={<OfferPage nft={data?.nft} marketplace={marketplace} refetch={refetch} />}
                    />
                    <Route
                      path={`/nfts/${data?.nft.address}/listings/new`}
                      element={
                        <SellNftPage nft={data?.nft} marketplace={marketplace} refetch={refetch} />
                      }
                    />
                  </Routes>
                ) : (
                  <Button block onClick={login} loading={connecting} className="mt-6">Connect</Button>
                )}
              </div>
            </div>
            <div className='grid grid-cols-2 gap-6 mt-8'>
              {loading ? (
                <>
                  <div className="h-16 bg-gray-800 rounded" />
                  <div className="h-16 bg-gray-800 rounded" />
                  <div className="h-16 bg-gray-800 rounded" />
                  <div className="h-16 bg-gray-800 rounded" />
                </>
              ) : (
                data?.nft.attributes.map(a => (
                  <div
                    key={a.traitType}
                    className='p-3 border border-gray-700 rounded'
                  >
                    <p className='uppercase label'>{a.traitType}</p>
                    <p className='truncate text-ellipsis' title={a.value}>
                      {a.value}
                    </p>
                  </div>
                ))
              )}

            </div>
          </div>
        </div >
        <div className='flex justify-between mt-10 mb-10 text-sm sm:text-base md:text-lg '>
          <div className='w-full'>
            <h2 className='mb-4 text-xl md:text-2xl text-bold'>Offers</h2>
            {ifElse(
              (offers: Offer[]) => and(pipe(length, equals(0))(offers), not(loading)),
              always(
                <div className='w-full p-10 text-center border border-gray-800 rounded-lg'>
                  <h3>No offers found</h3>
                  <p className='text-gray-500 mt-'>
                    There are currently no offers on this NFT.
                  </p>
                </div>
              ),
              (offers: Offer[]) => (
                <section className='w-full'>
                  <header className={
                    cx(
                      'grid px-4 mb-2',
                      ifElse(
                        all(isNil),
                        always('grid-cols-3'),
                        always('grid-cols-4')
                      )([offer, isOwner])
                    )
                  }>
                    <span className='label'>FROM</span>
                    <span className='label'>PRICE</span>
                    <span className='label'>WHEN</span>
                    {any(pipe(isNil, not))([offer, isOwner]) && (
                      <span className='label'></span>
                    )}
                  </header>
                  {
                    loading ? (
                      <>
                        <article className="bg-gray-800 mb-4 h-16 rounded" />
                        <article className="bg-gray-800 mb-4 h-16 rounded" />
                        <article className="bg-gray-800 mb-4 h-16 rounded" />
                      </>
                    ) : (
                      offers.map((o: Offer) => (
                        <article
                          key={o.address}
                          className={
                            cx(
                              'grid p-4 mb-4 border border-gray-700 rounded',
                              ifElse(
                                all(isNil),
                                always('grid-cols-3'),
                                always('grid-cols-4')
                              )([offer, isOwner])
                            )
                          }
                        >
                          <div>
                            <a
                              href={`https://holaplex.com/profiles/${o.buyer}`}
                              rel='nofollower'
                            >
                              {truncateAddress(o.buyer)}
                            </a>
                          </div>
                          <div>
                            <span className='sol-amount'>{toSOL(o.price.toNumber())}</span>
                          </div>
                          <div>{format(o.createdAt, 'en_US')}</div>
                          {(offer || isOwner) && (
                            <div className="flex w-full justify-end">
                              {equals(o.buyer, publicKey?.toBase58() as string) && <CancelOfferForm nft={data?.nft} marketplace={marketplace} offer={o} refetch={refetch} />}
                              {isOwner && (<AcceptOfferForm nft={data?.nft} marketplace={marketplace} offer={o} refetch={refetch} />)}
                            </div>
                          )}
                        </article>
                      ))
                    )
                  }
                </section >
              )
            )(offers)}
          </div >
        </div >
      </div >
    </>
  )
}

export default NftShow
