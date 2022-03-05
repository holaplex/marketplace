import { NextPage, NextPageContext } from "next"
import { AppProps } from 'next/app'
import { gql } from '@apollo/client'
import { add, isNil, pipe, ifElse, always, equals, length, find, prop } from 'ramda'
import client from '../../client'
import { Link } from 'react-router-dom'
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import NextLink from 'next/link'
import { Route, Routes } from 'react-router-dom'
import Offer from '../../components/Offer'
import SellNft from '../../components/SellNft'
import Avatar from '../../components/Avatar';
import { truncateAddress } from "../../modules/address";
import { Marketplace, Nft, NftListing } from "../../types"
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata'
import { Transaction, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

const solSymbol = '◎'
const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN
const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112")

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
  // For Testing different states
  const isOwner = equals(nft.owner.address, publicKey?.toBase58());
  const isListed = find(pipe(prop('auctionHouse'), equals(marketplace.auctionHouse.address)))(nft.listings);

  const listingPrice = 1

  const buyNftTransaction = async () => {
    // TODO: Get the price from the listing
    // const listingPrice = listing.price
    const listingPrice = "1"

    const tokenSize = '1'
    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(marketplace.auctionHouse.auction_houseFeeAccount)
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint)
    const nftOwner = new PublicKey(nft.owner.address)
    const tokenMint = new PublicKey(nft.mintAddress)
    const auctionHouseTreasury = new PublicKey(marketplace.auctionHouse.auctionHouseTreasury)


    if (!publicKey || !signTransaction) {
      return
    }

    const associatedTokenAccount = (
      await AuctionHouseProgram.findAssociatedTokenAccountAddress(tokenMint, new PublicKey(nft.owner.address))
    )[0]

    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const [escrowPaymentAccount, escrowPaymentBump] = await AuctionHouseProgram.findEscrowPaymentAccountAddress(auctionHouse, publicKey)

    const [buyerTradeStateAccount, buyerTradeStateBump] = await AuctionHouseProgram.findPublicBidTradeStateAddress(publicKey, auctionHouse, treasuryMint, tokenMint, listingPrice, tokenSize)
    const [sellerTradeStateAccount, sellerTradeStateBump] = await AuctionHouseProgram.findTradeStateAddress(nftOwner, auctionHouse, associatedTokenAccount, treasuryMint, tokenMint, listingPrice, tokenSize)
    const [freeTradeStateAccount, tradeStateBump] = await AuctionHouseProgram.findTradeStateAddress(nftOwner, auctionHouse, associatedTokenAccount, treasuryMint, tokenMint, '0', tokenSize)
    const [programAsSigner, programAsSignerBump] = await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()

    const publicBuyInstructionAccounts = {
      wallet: publicKey,
      paymentAccount: nftOwner,
      transferAuthority: publicKey,
      treasuryMint: treasuryMint,
      tokenAccount: associatedTokenAccount,
      metadata: metadata,
      escrowPaymentAccount: escrowPaymentAccount,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      buyerTradeState: buyerTradeStateAccount
    }

    const publicBuyInstructionArgs = {
      tradeStateBump: buyerTradeStateBump,
      escrowPaymentBump: escrowPaymentBump,
      buyerPrice: new BN(listingPrice),
      tokenSize: new BN(tokenSize)
    }

    const executeSaleInstructionAccounts = {
      buyer: publicKey,
      seller: nftOwner,
      tokenAccount: associatedTokenAccount,
      tokenMint: tokenMint,
      metadata: metadata,
      treasuryMint: treasuryMint,
      escrowPaymentAccount: escrowPaymentAccount,
      sellerPaymentReceiptAccount: nftOwner,
      buyerReceiptTokenAccount: publicKey,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      auctionHouseTreasury: auctionHouseTreasury,
      buyerTradeState: buyerTradeStateAccount,
      sellerTradeState: sellerTradeStateAccount,
      freeTradeState: freeTradeStateAccount,
      programAsSigner: programAsSigner
    }

    const executeSaleInstructionArgs = {
      escrowPaymentBump: escrowPaymentBump,
      freeTradeStateBump: tradeStateBump,
      programAsSignerBump: programAsSignerBump,
      buyerPrice: new BN(listingPrice),
      tokenSize: new BN(tokenSize)
    }

    // generate instruction
    const publicBuyInstruction = AuctionHouseProgram.instructions.createPublicBuyInstruction(publicBuyInstructionAccounts, publicBuyInstructionArgs)
    const executeSaleInstruction = AuctionHouseProgram.instructions.createExecuteSaleInstruction(executeSaleInstructionAccounts, executeSaleInstructionArgs)

    const txt = new Transaction()

    // add instructions to tx
    txt.add(publicBuyInstruction)
    txt.add(executeSaleInstruction)

    // lookup recent block hash and assign fee payer (the current logged in user)
    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    // sign it
    const signed = await signTransaction(txt)

    // submit transaction
    const signature = await connection.sendRawTransaction(signed.serialize())
    await connection.confirmTransaction(signature, 'processed')
  }


  const cancelListingTransaction = async () => {
    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(marketplace.auctionHouse.auction_houseFeeAccount)
    const tokenMint = new PublicKey(nft.mintAddress);
    const associatedTokenAccount = (
      await AuctionHouseProgram.findAssociatedTokenAccountAddress(tokenMint, new PublicKey(nft.owner.address))
    )[0];

    if (!publicKey || !signTransaction) {
      return;
    }

    const [tradeState, tradeStateBump] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      associatedTokenAccount,
      NATIVE_MINT,
      tokenMint,
      String(listingPrice),
      "1",
    );

    const cancelInstructionAccounts = {
      wallet: publicKey,
      tokenAccount: associatedTokenAccount,
      tokenMint: tokenMint,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      tradeState: tradeState,
    }

    const cancelInstructionArgs = {
      buyerPrice: new BN(listingPrice),
      tokenSize: new BN(1)
    }

    const cancelInstruction = AuctionHouseProgram.instructions.createCancelInstruction(cancelInstructionAccounts, cancelInstructionArgs)

    // make transaction
    const txt = new Transaction();

    txt.add(cancelInstruction);

    // lookup recent block hash and assign fee payer (the current logged in user)
    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    txt.feePayer = publicKey;

    const signed = await signTransaction(txt);

    // submit transaction
    const signature = await connection.sendRawTransaction(signed.serialize());

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
          <div className="">
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
                {isListed &&
                  <div className="flex-1">
                    <div className="label">PRICE</div>
                    <p className="text-base md:text-xl lg:text-3xl">
                      <b>{solSymbol} 1.5</b>
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
                        {isOwner && !isListed &&
                          <Link to={`/nfts/${nft.address}/listings/new`} className="flex-1 button">Sell NFT</Link>
                        }
                        {isListed && !isOwner &&
                          <button className="flex-1 button" onClick={() => { buyNftTransaction(); }}>Buy Now</button>
                        }
                        {isListed && isOwner &&
                          <button className="flex-1 button secondary" onClick={() => {
                            cancelListingTransaction()
                          }}>Cancel Listing</button>
                        }
                      </>
                    )}
                  />
                  <Route
                    path={`/nfts/${nft.address}/offers/new`}
                    element={<Offer nft={nft} marketplace={marketplace} />}
                  />
                  <Route
                    path={`/nfts/${nft.address}/listings/new`}
                    element={<SellNft nft={nft} marketplace={marketplace} />}
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
            <h1 className="text-xl md:text-2xl">
              <b>Offers</b>
            </h1>

            <div className="grid grid-cols-3 p-4 sm:grid-cols-4">
              <div className="uppercase label">FROM</div>
              <div className="uppercase label">PRICE</div>
              <div className="uppercase label">DATE</div>
            </div>

            <div className="grid grid-cols-3 p-4 mb-4 border border-gray-700 rounded-lg sm:grid-cols-4">
              <div>
                <img
                  src="https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg"
                  className="object-contain rounded-full mr-2 inline-block h-[30px]"
                />
                <span>@skelly</span>
              </div>
              <div className="icon-sol">75</div>
              <div>3 hours ago</div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]">
              <div>
                <img
                  src="https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg"
                  className="object-contain rounded-full mr-2 inline-block h-[30px]"
                />
                <span>@skelly</span>
              </div>
              <div className="icon-sol">100</div>
              <div>10 hours ago</div>
            </div>
          </div>
        </div>
        {/* END OF OFFERS SECTION */}
      </div>
    </>
  )
}

export default NftShow
