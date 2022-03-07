import { NextPage, NextPageContext } from "next"
import { AppProps } from 'next/app'
import { gql } from '@apollo/client'
import { isNil, pipe, ifElse, always, equals, length, find, prop, filter } from 'ramda'
import client from '../../client'
import { Link } from 'react-router-dom'
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import NextLink from 'next/link'
import { Route, Routes } from 'react-router-dom'
import OfferPage from '../../components/Offer';
import SellNftPage from '../../components/SellNft';
import Avatar from '../../components/Avatar';
import { truncateAddress } from "../../modules/address";
import { Marketplace, Nft, Listing, Offer } from "../../types";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house';
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata';
import { format } from 'timeago.js';
import { Transaction, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toSOL } from "../../modules/lamports";
import { toast } from "react-toastify"

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN;

const {
  createPublicBuyInstruction,
  createExecuteSaleInstruction,
  createCancelInstruction,
  createPrintBidReceiptInstruction,
  createCancelListingReceiptInstruction,
  createPrintPurchaseReceiptInstruction,
} = AuctionHouseProgram.instructions;

const pickAuctionHouse = prop('auctionHouse');

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'];

  const {
    data: { marketplace, nft },
  } = await client.query<GetNftPage>({
    query: gql`
      query GetNftPage($subdomain: String!, $address: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          description
          logoUrl
          bannerUrl
          ownerAddress
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
          name
          address
          image
          sellerFeeBasisPoints
          mintAddress
          description
          owner{
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
    `,
    variables: {
      subdomain: (subdomain || SUBDOMAIN),
      address: (query?.address || [])[0],
    },
  })

  if (isNil(marketplace)) {
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

const NftShow: NextPage<NftPageProps> = ({ marketplace, nft }) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const isMarketplaceAuctionHouse = equals(marketplace.auctionHouse.address);
  const isOwner = equals(nft.owner.address, publicKey?.toBase58());
  const listing = find<Listing>(pipe(pickAuctionHouse, isMarketplaceAuctionHouse))(nft.listings);
  const offers = filter<Offer>(pipe(pickAuctionHouse, isMarketplaceAuctionHouse))(nft.offers);

  const buyNftTransaction = async () => {
    if (!publicKey || !signTransaction || !listing || isOwner) {
      return
    }

    const auctionHouse = new PublicKey(marketplace.auctionHouse.address);
    const authority = new PublicKey(marketplace.auctionHouse.authority);
    const auctionHouseFeeAccount = new PublicKey(marketplace.auctionHouse.auctionHouseFeeAccount);
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint);
    const seller = new PublicKey(listing.seller);
    const tokenMint = new PublicKey(nft.mintAddress);
    const auctionHouseTreasury = new PublicKey(marketplace.auctionHouse.auctionHouseTreasury);
    const listingReceipt = new PublicKey(listing.address);

    const [tokenAccount] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(tokenMint, new PublicKey(nft.owner.address));
    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint);

    const [escrowPaymentAccount, escrowPaymentBump] = await AuctionHouseProgram.findEscrowPaymentAccountAddress(auctionHouse, publicKey);

    const [buyerTradeState, tradeStateBump] = await AuctionHouseProgram.findPublicBidTradeStateAddress(publicKey, auctionHouse, treasuryMint, tokenMint, listing.price, 1);
    const [sellerTradeState] = await AuctionHouseProgram.findTradeStateAddress(seller, auctionHouse, tokenAccount, treasuryMint, tokenMint, listing.price, 1);
    const [freeTradeState, freeTradeStateBump] = await AuctionHouseProgram.findTradeStateAddress(seller, auctionHouse, tokenAccount, treasuryMint, tokenMint, 0, 1);
    const [programAsSigner, programAsSignerBump] = await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress();
    const [buyerReceiptTokenAccount] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(publicKey, tokenMint);

    const [bidReceipt, bidReceiptBump] = await AuctionHouseProgram.findBidReceiptAddress(buyerTradeState);
    const [purchaseReceipt, purchaseReceiptBump] = await AuctionHouseProgram.findPurchaseReceiptAddress(sellerTradeState, buyerTradeState);

    const publicBuyInstructionAccounts = {
      wallet: publicKey,
      paymentAccount: tokenAccount,
      transferAuthority: publicKey,
      treasuryMint,
      tokenAccount,
      metadata,
      escrowPaymentAccount,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      buyerTradeState,
    };
    const publicBuyInstructionArgs = {
      tradeStateBump,
      escrowPaymentBump,
      buyerPrice: listing.price,
      tokenSize: 1,
    };

    const executeSaleInstructionAccounts = {
      buyer: publicKey,
      seller,
      tokenAccount,
      tokenMint,
      metadata,
      treasuryMint,
      escrowPaymentAccount,
      sellerPaymentReceiptAccount: tokenAccount,
      buyerReceiptTokenAccount,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      auctionHouseTreasury,
      buyerTradeState,
      sellerTradeState,
      freeTradeState,
      programAsSigner
    };
    const executeSaleInstructionArgs = {
      escrowPaymentBump,
      freeTradeStateBump,
      programAsSignerBump,
      buyerPrice: listing.price,
      tokenSize: 1,
    };

    const printBidReceiptAccounts = {
      bookkeeper: publicKey,
      receipt: bidReceipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    };
    const printBidReceiptArgs = {
      receiptBump: bidReceiptBump,
    };

    const printPurchaseReceiptAccounts = {
      bookkeeper: publicKey,
      purchaseReceipt,
      bidReceipt,
      listingReceipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    };
    const printPurchaseReceiptArgs = {
      purchaseReceiptBump,
    };

    const publicBuyInstruction = createPublicBuyInstruction(publicBuyInstructionAccounts, publicBuyInstructionArgs);
    const executeSaleInstruction = createExecuteSaleInstruction(executeSaleInstructionAccounts, executeSaleInstructionArgs);
    const printBidReceiptInstruction = createPrintBidReceiptInstruction(printBidReceiptAccounts, printBidReceiptArgs);
    const printPurchaseReceiptInstruction = createPrintPurchaseReceiptInstruction(printPurchaseReceiptAccounts, printPurchaseReceiptArgs);

    const txt = new Transaction();

    txt
      .add(publicBuyInstruction)
      .add(printBidReceiptInstruction)
      .add(executeSaleInstruction)
      .add(printPurchaseReceiptInstruction);

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    txt.feePayer = publicKey;

    const signed = await signTransaction(txt);

    const signature = await connection.sendRawTransaction(signed.serialize());
    toast("Transaction Sent!");
    await connection.confirmTransaction(signature, 'processed');
  }


  const cancelListingTransaction = async () => {
    if (!publicKey || !signTransaction || !listing || !isOwner) {
      return
    }

    const auctionHouse = new PublicKey(marketplace.auctionHouse.address);
    const authority = new PublicKey(marketplace.auctionHouse.authority);
    const auctionHouseFeeAccount = new PublicKey(marketplace.auctionHouse.auctionHouseFeeAccount);
    const tokenMint = new PublicKey(nft.mintAddress);
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint);
    const receipt = new PublicKey(listing.address);
    const [tokenAccount] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(tokenMint, new PublicKey(nft.owner.address));

    const [tradeState] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      tokenAccount,
      treasuryMint,
      tokenMint,
      listing.price,
      1,
    );

    const cancelInstructionAccounts = {
      wallet: publicKey,
      tokenAccount,
      tokenMint,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      tradeState,
    };
    const cancelInstructionArgs = {
      buyerPrice: listing.price,
      tokenSize: 1
    };

    const cancelListingReceiptAccounts = {
      receipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    };

    const cancelInstruction = createCancelInstruction(cancelInstructionAccounts, cancelInstructionArgs);
    const cancelListingReceiptInstruction = createCancelListingReceiptInstruction(cancelListingReceiptAccounts);

    const txt = new Transaction();

    txt
      .add(cancelInstruction)
      .add(cancelListingReceiptInstruction);

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    txt.feePayer = publicKey;

    const signed = await signTransaction(txt);

    const signature = await connection.sendRawTransaction(signed.serialize());
    toast("Transaction Sent!");
    await connection.confirmTransaction(signature, 'processed');
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
        <NextLink href="/">
          <a>
            <button className="flex items-center justify-between gap-2 px-4 py-2 bg-gray-800 rounded-full align h-14 hover:bg-gray-600">
              <img className="w-8 h-8 rounded-full aspect-square" src={marketplace.logoUrl} />
              {marketplace.name}
            </button>
          </a>
        </NextLink>
        <WalletMultiButton>Connect</WalletMultiButton>
      </div>
      <div className="container px-4 pb-10 mx-auto text-white">
        <div className="grid items-start grid-cols-1 gap-6 mt-12 mb-10 lg:grid-cols-2">
          <div className="block mb-4 lg:mb-0 lg:flex lg:items-center lg:justify-center ">
            <div className="block mb-6 lg:hidden">
              <p className="mb-4 text-2xl lg:text-4xl md:text-3xl">
                <b>{nft.name}</b>
              </p>
              <p className="text-lg">{nft.description}</p>
            </div>
            <img
              src={nft.image}
              className="block h-auto max-w-full border-none rounded-lg shadow"
            />
          </div>
          <div>
            <div className="hidden mb-8 lg:block">
              <p className="mb-4 text-2xl lg:text-4xl md:text-3xl">
                <b>{nft.name}</b>
              </p>
              <p className="text-lg">{nft.description}</p>
            </div>
            <div className="flex-1 mb-8">
              <div className="mb-1 label">{ifElse(pipe(length, equals(1)), always('CREATOR'), always('CREATORS'))(nft.creators)}</div>
              <ul>
                {nft.creators.map(({ address }) => (
                  <li key={address}>
                    <a href={`https://holaplex.com/profiles/${address}`} rel="noreferrer" target="_blank">
                      <Avatar name={truncateAddress(address)} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full p-6 mt-8 bg-gray-800 rounded-lg">
              <div className="flex mb-6">
                {listing &&
                  <div className="flex-1">
                    <div className="label">PRICE</div>
                    <p className="text-base md:text-xl lg:text-3xl">
                      <b className="sol-input">{toSOL(listing.price)}</b>
                    </p>
                  </div>
                }
                <div className="flex-1">
                  <div className="mb-1 label">OWNER</div>
                  <a href={`https://holaplex.com/profiles/${nft.owner.address}`} rel="noreferrer" target="_blank">
                    <Avatar
                      name={truncateAddress(nft.owner.address)}
                    />
                  </a>
                </div>
              </div>

              <div className="flex gap-4 overflow-visible">
                <Routes>
                  <Route
                    path={`/nfts/${nft.address}`}
                    element={(
                      <>
                        {!isOwner &&
                          <Link to={`/nfts/${nft.address}/offers/new`} className="flex-1 button secondary">Make Offer</Link>
                        }
                        {isOwner && !listing &&
                          <Link to={`/nfts/${nft.address}/listings/new`} className="flex-1 button">Sell NFT</Link>
                        }
                        {listing && !isOwner &&
                          <button
                            className="flex-1 button"
                            onClick={buyNftTransaction
                            }
                          >
                            Buy Now
                          </button>
                        }
                        {listing && isOwner &&
                          <button
                            className="flex-1 button secondary"
                            onClick={cancelListingTransaction}
                          >
                            Cancel Listing
                          </button>
                        }
                      </>
                    )}
                  />
                  <Route
                    path={`/nfts/${nft.address}/offers/new`}
                    element={<OfferPage nft={nft} marketplace={marketplace} />}
                  />
                  <Route
                    path={`/nfts/${nft.address}/listings/new`}
                    element={<SellNftPage nft={nft} marketplace={marketplace} />}
                  />
                </Routes>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-8">
              {nft.attributes.map((a) => (
                <div key={a.traitType} className="p-3 border border-gray-700 rounded">
                  <p className="uppercase label">{a.traitType}</p>
                  <p className="truncate text-ellipsis" title={a.value}>{a.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-between px-4 mt-10 mb-10 text-sm sm:text-base md:text-lg ">
          <div className="w-full">
            <h2 className="mb-4 text-xl md:text-2xl text-bold">
              Offers
            </h2>
            {ifElse(
              pipe(length, equals(0)),
              always((
                <div className='w-full p-10 text-center border border-gray-800 rounded-lg'>
                  <h3>No offers found</h3>
                  <p className='text-gray-500 mt-'>There are currently no offers on this NFT.</p>
                </div>
              )),
              (offers: Offer[]) => (
                <section className="w-full">
                  <header className="grid grid-cols-3 px-4 mb-2">
                    <span className="label">FROM</span>
                    <span className="label">PRICE</span>
                    <span className="label">WHEN</span>
                  </header>
                  {offers.map(({ address, buyer, price, createdAt }: Offer) => (
                    <article key={address} className="grid grid-cols-3 p-4 border border-gray-700 rounded">
                      <div>
                        <a href={`https://holaplex.com/profiles/${buyer}`} rel="nofollower">
                          {truncateAddress(buyer)}
                        </a>
                      </div>
                      <div>
                        <span className="sol-amount">{toSOL(price)}</span>
                      </div>
                      <div>{format(createdAt, 'en_US')}</div>
                    </article>
                  ))}
                </section>
              )
            )(offers)}
          </div>
        </div>
      </div>
    </>
  )
}

export default NftShow
