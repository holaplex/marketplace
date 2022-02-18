import { NextPage } from "next"
import { AppProps } from 'next/app'
import { gql } from '@apollo/client'
import { isNil } from 'ramda'
import client from '../../client'
import { Link } from 'react-router-dom';
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import NextLink from 'next/link'
import { Route, Routes } from 'react-router-dom'
import Offer from '../../components/Offer';
import SellNft from '../../components/SellNft';

const solSymbol = '◎'
const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

export async function getServerSideProps(ctx: any) {
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
          attributes {
            traitType
            value
          }
        }
      }
    `,
    variables: {
      subdomain: SUBDOMAIN,
      address: ctx.params.address[0],
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

interface Nft {
  name: string
  address: string
  description: string
  image: string
  sellerFeeBasisPoints: number
  mintAddress: string
  attributes: NftAttribute[]
}

interface NftPageProps extends AppProps {
  storefront: Storefront
  nft: Nft
}

const Nft: NextPage<NftPageProps> = ({ storefront, nft }) => {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
        <NextLink href="/">
          <a>
            <button className="flex items-center justify-between gap-2 px-4 py-2 bg-gray-800 rounded-full align h-14 hover:bg-gray-600">
              <img className="w-8 h-8 rounded-full aspect-square" src={storefront.logoUrl} />
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
              <h1 className="text-2xl lg:text-4xl md:text-3xl">
                <b>{nft.name}</b>
              </h1>
              <p className="text-lg">{nft.description}</p>
            </div>
            <img
              src={nft.image}
              className="block h-auto max-w-full border-none rounded-lg shadow"
            />
          </div>
          <div className="px-4">
            <div className="hidden lg:block xl:block 2xl:block">
              <h1 className="text-2xl lg:text-4xl md:text-3xl">
                <b>{nft.name}</b>
              </h1>
              <p className="text-lg">{nft.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-8">
              {nft.attributes.map((a) => (
                <div key={a.traitType} className="px-4 py-4 rounded border border-[#383838]">
                  <h1 className="text-gray-400 uppercase">{a.traitType}</h1>
                  <p>{a.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full md:flex p-6 rounded-lg bg-[#282828]">
          <div className="mb-6 w-12/12 md:w-5/12 lg:w-7/12 md:mb-0">
            <div className="flex grid-cols-2">

              <div className="grow">
                <p className="text-gray-400">OWNER</p>
                <img
                  src={storefront.logoUrl}
                  className="object-contain rounded-full inline-block h-[24px] mr-2"
                />
                <span className="font-mono text-lg tracking-wider">{storefront.ownerAddress.slice(0,4) + "..." + storefront.ownerAddress.slice(-4) }</span>
              </div>

              <div className="grow">
                <p className="text-gray-400 xs:float-left lg:float-none">
                  PRICE
                </p>
                <p className="text-base md:text-xl lg:text-3xl">
                  <b>{solSymbol} 1.5</b>
                </p>
              </div>
            </div>
          </div>
          <div className="text-center md:mx-0 md:px-0 w-12/12 md:w-7/12 lg:w-5/12">
            <Routes>
              <Route
                path={`/nfts/${nft.address}`}
                element={(
                  <div className="grid flex-grow grid-cols-2 gap-4">
                    <Link to={`/nfts/${nft.address}/offers/new`} className="w-full">
                      <button className="w-full px-10 text-sm text-white transition-colors duration-150 bg-black rounded-full h-14 lg:text-xl md:text-base focus:shadow-outline hover:bg-black">
                        Make Offer
                      </button>
                    </Link>
                    <Link to={`/nfts/${nft.address}/listings/new`} className="w-full">
                      <button className="w-full px-10 text-sm text-black transition-colors duration-150 bg-white rounded-full hover:bg-gray-100 h-14 lg:text-xl md:text-base focus:shadow-outline">
                        Sell NFT
                      </button>
                    </Link>
                    <button className="w-full px-10 text-sm text-black transition-colors duration-150 bg-white rounded-full h-14 lg:text-xl md:text-base focus:shadow-outline hover:bg-gray-100">
                      Buy Now
                    </button>
                  </div>
                )}
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
        <div className="flex justify-between px-4 mt-10 mb-10 text-sm sm:text-base md:text-lg ">
          <div className="w-full">
            <h1 className="text-xl md:text-2xl">
              <b>Offers</b>
            </h1>

            <div className="grid grid-cols-3 p-4 text-gray-400 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4">
              <div>FROM</div>
              <div>PRICE</div>
              <div>DATE</div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]">
              <div>
                <img
                  src="https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg"
                  className="object-contain rounded-full mr-2 inline-block h-[30px]"
                />
                <span>@skelly</span>
              </div>
              <div className=">{solSymbol} 75</div>
            <div className=">3 hours ago</div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]">
              <div>
                <img
                  src="https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg"
                  className="object-contain rounded-full mr-2 inline-block h-[30px]"
                />
                <span>@skelly</span>
              </div>
              <div>{solSymbol} 100</div>
              <div>10 hours ago</div>
            </div>
          </div>
        </div>
        {/* END OF OFFERS SECTION */}

        {/* ACTIVITIES SECTION */}
        <div className="flex justify-between mt-10 mb-10 text-sm sm:text-base md:text-lg ">
          <div className="w-full mx-4">
            <h1 className="text-xl md:text-2xl">
              <b>Activities</b>
            </h1>

            <div className="grid grid-cols-4 p-4 text-gray-400">
              <div>EVENT</div>
              <div>WALLETS</div>
              <div>PRICE</div>
              <div>WHEN</div>
            </div>

            <div className="grid grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="float-left pt-1 feather feather-dollar-sign"
                >
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <span className="hidden md:block lg:block xl:block">Listed</span>
              </div>
              <div>
                <img
                  src="https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg"
                  className="object-contain rounded-full mr-2 inline-block h-[30px]"
                />
                <span>@skelly</span>
              </div>
              <div>{solSymbol} 75</div>
              <div>3 hours ago</div>
            </div>

            <div className="grid grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="float-left pt-1 feather feather-dollar-sign"
                >
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <span className="hidden md:block lg:block xl:block">Listed</span>
              </div>
              <div>
                <img
                  src="https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg"
                  className="object-contain rounded-full mr-2 inline-block h-[30px]"
                />
                <span>@skelly</span>
              </div>
              <div>{solSymbol} 100</div>
              <div>10 hours ago</div>
            </div>

            <div className="grid grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="float-left pt-1 mr-1 feather feather-tag"
                >
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
                <span className="hidden md:block lg:block xl:block">Sold</span>
              </div>

              <div className="inline-block">
                <p>
                  <span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      className="inline-block feather feather-corner-up-right"
                    >
                      <polyline points="15 14 20 9 15 4"></polyline>
                      <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                    </svg>
                  </span>
                  damien.sol
                </p>
                <p>
                  <span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      className="inline-block feather feather-corner-down-right"
                    >
                      <polyline points="15 10 20 15 15 20"></polyline>
                      <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
                    </svg>
                  </span>
                  @skelly
                </p>
              </div>
              <div>{solSymbol} 75</div>
              <div>3 hours ago</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Nft
