import { NextPage, NextPageContext } from "next"
import { AppProps } from 'next/app'
import { gql } from '@apollo/client'
import { isNil } from 'ramda'
import client from '../../client'
import { Link } from 'react-router-dom'
import * as anchor from '@project-serum/anchor'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import NextLink from 'next/link'
import { Route, Routes } from 'react-router-dom'
import Offer from '../../components/Offer'
import SellNft from '../../components/SellNft'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'

const {
  createBuyInstruction,
  createExecuteSaleInstruction,
} = AuctionHouseProgram.instructions

const solSymbol = '◎'
const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

interface NextPageContextWithParams extends NextPageContext {
  params: any;
}

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'];
  
  const {
    data: { storefront, nft },
  } = await client.query<GetNftPage>({
    query: gql`
      query GetNftPage($subdomain: String!, $address: String!) {
        storefront(subdomain: $subdomain) {
          title
          description
          logoUrl
          faviconUrl
          bannerUrl
          ownerAddress
        }
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
          listings {
            price
          }
          attributes {
            traitType
            value
          }
        }
      }
    `,
    variables: {
      subdomain: (subdomain || SUBDOMAIN),
      address: (query?.address || [])[0],
    },
  })

  if (isNil(storefront)) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      storefront,
      nft,
    },
  }
}

interface GetNftPage {
  storefront: Storefront | null
  nft: Nft | null
}

interface Storefront {
  title: string
  description: string
  logoUrl: string
  bannerUrl: string
  faviconUrl: string
  subdomain: string
  ownerAddress: string
}

interface NftAttribute {
  value: string
  traitType: string
}

interface NftOwner{
  address: string
}

interface NftListing{
  price: string
}

interface Nft {
  name: string
  address: string
  description: string
  image: string
  sellerFeeBasisPoints: number
  mintAddress: string
  attributes: NftAttribute[]
  owner: NftOwner
  listings: NftListing[]
}

interface NftPageProps extends AppProps {
  storefront: Storefront
  nft: Nft
}

const Nft: NextPage<NftPageProps> = ({ storefront, nft }) => {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const buyThisNft = async () => {
    if (!publicKey || !signTransaction) {
      return
    }

    // TO DO: get price from NFT
    const buyerPrice = String( Number(nft.listing[0].price) * LAMPORTS_PER_SOL)

    // setup addresses and pubkeys
    const tokenMint = new PublicKey(nft.mintAddress)

    // TODO: read authority from auction house record (auctionHouse.authority)
    const authority = new PublicKey(
      'BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR'
    )

    // TODO: read auction house from indexer
    const auctionHouse = new PublicKey(
      'BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR'
    )

    const auctionHouseFeeAccount = new PublicKey(
      'BXUEBP3meoskWuU6aksqKKAcvRNLPzhjqL5RFeUd5vAR'
    )

    // setup function call parameters

    // create buy
    const associatedTokenAccount = (
      await AuctionHouseProgram.getAtaForMint(tokenMint, new PublicKey(nft.owner.address))
    )[0] 

    const metadata = await AuctionHouseProgram.getMetadata(tokenMint)

    const [
      escrowPaymentAccount,
      escrowPaymentBump,
    ] = await AuctionHouseProgram.findEscrowPaymentAccount(
      auctionHouse,
      publicKey
    )

    const [
      buyerTradeState,
      tradeStateBump,
    ] = await AuctionHouseProgram.findTradeStateAccount(
      publicKey,
      auctionHouse,
      associatedTokenAccount,
      NATIVE_MINT,
      tokenMint,
      buyerPrice,
      '1' // token size
    )

    // Find TradeState Account
    const [
      sellerTradeState,
      sellerTradeStateBump,
    ] = await AuctionHouseProgram.findTradeStateAccount(
      new PublicKey(nft.owner.address), 
      auctionHouse,
      associatedTokenAccount,
      NATIVE_MINT,
      tokenMint,
      buyerPrice,
      '1'
    )

    const [freeTradeState, freeTradeBump] = 
    await AuctionHouseProgram.getAuctionHouseTradeState(
      auctionHouse,
      publicKey,
      associatedTokenAccount,
      NATIVE_MINT,
      tokenMint,
      1,
      0 
    )

    const [
      programAsSigner,
      programAsSignerBump,
    ] = await AuctionHouseProgram.getAuctionHouseProgramAsSigner()

    const buyInstructionAccounts = {
      wallet: publicKey,
      paymentAccount: new PublicKey(nft.owner.address), 
      transferAuthority: publicKey,
      treasuryMint: NATIVE_MINT,
      tokenAccount: associatedTokenAccount,
      metadata: metadata,
      escrowPaymentAccount: escrowPaymentAccount,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      buyerTradeState: buyerTradeState,
    }

    const buyInstructionArgs = {
      tradeStateBump: tradeStateBump,
      escrowPaymentBump: escrowPaymentBump,
      buyerPrice: Number(buyerPrice),
      tokenSize: new anchor.BN(1),
    }

    const [
      treasuryAccount,
      treasuryBump,
    ] = await AuctionHouseProgram.getAuctionHouseTreasuryAcct(auctionHouse)

    const buyInstruction = createBuyInstruction(
      buyInstructionAccounts,
      buyInstructionArgs
    )

    // execute sale
    const executeSaleInstructionAccounts = {
      buyer: publicKey,
      seller: new PublicKey(nft.owner.address), 
      tokenAccount: associatedTokenAccount,
      tokenMint: tokenMint,
      metadata: metadata,
      treasuryMint: NATIVE_MINT,
      escrowPaymentAccount: escrowPaymentAccount,
      sellerPaymentReceiptAccount: new PublicKey(nft.owner.address),
      buyerReceiptTokenAccount: publicKey,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      auctionHouseTreasury: treasuryAccount,
      buyerTradeState: buyerTradeState,
      sellerTradeState: sellerTradeState,
      freeTradeState: freeTradeState,
      programAsSigner: programAsSigner,
    }

    const executeSaleInstructionArgs = {
      escrowPaymentBump: escrowPaymentBump,
      freeTradeStateBump: freeTradeBump,
      programAsSignerBump: programAsSignerBump,
      buyerPrice: Number(buyerPrice),
      tokenSize: new anchor.BN(1),
    }

    // create instruction calls
    const saleInstruction = createExecuteSaleInstruction(
      executeSaleInstructionAccounts,
      executeSaleInstructionArgs
    )

    // create tx
    const txt = new Transaction()

    // add instructions to tx
    txt.add(buyInstruction)
    txt.add(saleInstruction)

    // add block hash
    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash

    // assign fee payer
    txt.feePayer = publicKey

    // sign
    const signed = await signTransaction(txt)

    // send
    const signature = await connection.sendRawTransaction(signed.serialize())

    // wait for it
    await connection.confirmTransaction(signature, 'processed')
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
        <NextLink href="/">
          <a>
            <button className='flex items-center justify-between gap-2 px-4 py-2 bg-gray-800 rounded-full align h-14 hover:bg-gray-600'>
              <img
                className='w-8 h-8 rounded-full aspect-square'
                src={storefront.logoUrl}
              />
              {storefront.title}
            </button>
          </a>
        </NextLink>
        <WalletMultiButton>Connect</WalletMultiButton>
      </div>
      <div className="container pb-10 mx-auto text-white">
        <div className="grid grid-cols-1 mt-12 mb-10 lg:grid-cols-2">
          <div className="block px-4 mb-4 lg:mb-0 lg:flex lg:items-center lg:justify-center ">
            <div className="block mb-6 lg:hidden">
            <p className="mb-4 text-2xl lg:text-4xl md:text-3xl">
                <b>{nft.name}</b>
              </p>
              <p className="text-lg">{nft.description}</p>
            </div>
            <img
              src={nft.image}
              className='block h-auto max-w-full border-none rounded-lg shadow'
            />
          </div>
          <div className="px-4">
            <div className="hidden lg:block xl:block 2xl:block">
              <p className="mb-4 text-2xl lg:text-4xl md:text-3xl">
                <b>{nft.name}</b>
              </p>
              <p className="text-lg">{nft.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-8">
              {nft.attributes.map((a) => (
                <div key={a.traitType} className="px-4 py-4 rounded border border-[#383838]">
                  <p className="text-lg text-gray-300 uppercase">{a.traitType}</p>
                  <p>{a.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='w-full md:flex p-6 rounded-lg bg-[#282828]'>
          <div className='mb-6 w-12/12 md:w-5/12 lg:w-7/12 md:mb-0'>
            <div className='flex grid-cols-2'>
              <div className='grow'>
                <p className='text-gray-400'>OWNER</p>
                <img
                  src={storefront.logoUrl}
                  className='object-contain rounded-full inline-block h-[24px] mr-2'
                />
                <span className='font-mono text-lg tracking-wider'>
                  {storefront.ownerAddress.slice(0, 4) +
                    '...' +
                    storefront.ownerAddress.slice(-4)}
                </span>
              </div>

              <div className='grow'>
                <p className='text-gray-400 xs:float-left lg:float-none'>
                  PRICE
                </p>
                <p className='text-base md:text-xl lg:text-3xl'>
                  <b>{solSymbol} 1.5</b>
                </p>
              </div>
            </div>
          </div>
          <div className='text-center md:mx-0 md:px-0 w-12/12 md:w-7/12 lg:w-5/12'>
            <Routes>
              <Route
                path={`/nfts/${nft.address}`}
                element={
                  <div className='grid flex-grow grid-cols-2 gap-4'>
                    <Link
                      to={`/nfts/${nft.address}/offers/new`}
                      className='w-full'
                    >
                      <button className='w-full px-10 text-sm text-white transition-colors duration-150 bg-black rounded-full h-14 lg:text-xl md:text-base focus:shadow-outline hover:bg-black'>
                        Make Offer
                      </button>
                    </Link>
                    <Link
                      to={`/nfts/${nft.address}/listings/new`}
                      className='w-full'
                    >
                      <button className='w-full px-10 text-sm text-black transition-colors duration-150 bg-white rounded-full hover:bg-gray-100 h-14 lg:text-xl md:text-base focus:shadow-outline'>
                        Sell NFT
                      </button>
                    </Link>
                    <button
                      className='w-full px-10 text-sm text-black transition-colors duration-150 bg-white rounded-full h-14 lg:text-xl md:text-base focus:shadow-outline hover:bg-gray-100'
                      onClick={() => {
                        buyThisNft()
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                }
              />
              <Route
                path={`/nfts/${nft.address}/offers/new`}
                element={<Offer nft={nft} />}
              />
              <Route
                path={`/nfts/${nft.address}/listings/new`}
                element={<SellNft nft={nft} />}
              />
            </Routes>
          </div>
        </div>
        <div className='flex justify-between px-4 mt-10 mb-10 text-sm sm:text-base md:text-lg '>
          <div className='w-full'>
            <h1 className='text-xl md:text-2xl'>
              <b>Offers</b>
            </h1>

            <div className='grid grid-cols-3 p-4 text-gray-400 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4'>
              <div>FROM</div>
              <div>PRICE</div>
              <div>DATE</div>
            </div>

            <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]'>
              <div>
                <img
                  src='https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg'
                  className='object-contain rounded-full mr-2 inline-block h-[30px]'
                />
                <span>@skelly</span>
              </div>
              <div
                className='>{solSymbol} 75</div>
            <div className='
              >
                3 hours ago
              </div>
            </div>

            <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]'>
              <div>
                <img
                  src='https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg'
                  className='object-contain rounded-full mr-2 inline-block h-[30px]'
                />
                <span>@skelly</span>
              </div>
              <div>{solSymbol} 100</div>
              <div>10 hours ago</div>
            </div>
          </div>
        </div>
        {/* END OF OFFERS SECTION */}
      </div>
    </>
  )
}

export default Nft
