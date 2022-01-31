import { NextPage } from 'next'
import { AppProps } from 'next/app';
import { gql } from '@apollo/client'
import { isNil } from 'ramda';
import client from '../../client';

const solSymbol = '◎'
const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN;

export async function getServerSideProps(ctx: any) {
  const { data: { storefront, nft } } = await client.query<GetNftPage>({
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
          details {
            image
            description
          }
        }
      }
    `,
    variables: {
      subdomain: SUBDOMAIN,
      address: ctx.params.address
    }
  });

  if (isNil(storefront)) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      storefront,
      nft 
    }
  };
}

interface GetNftPage {
  storefront: Storefront | null;
  nft: NftData | null;
}

interface Storefront {
  title: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  faviconUrl: string;
  subdomain: string;
  ownerAddress: string;
}

interface NftDetail {
  description: string
  image: string
}

// will become flat in the future, be aware. 
interface NftData { 
  name: string,
  address: string
  details: NftDetail
}


interface NftPageProps extends AppProps {
  storefront: Storefront;
  nft: NftData
}


const Nft: NextPage<NftPageProps> = ({ storefront, nft }) => {
  return (
    <div className='app-wrapper bg-black text-white pt-5 pb-10'>
      {/* NFT Description Area */}
      <div className='px-6 mt-20 mb-10 grid grid-cols-1 lg:grid-cols-2'>
        <div className='px-4 mb-4 lg:mb-0 lg:flex lg:items-center lg:justify-center block '>
          <div className='block lg:hidden mb-6'>
            <h1 className='lg:text-4xl  md:text-3xl text-2xl'>
              <b>{nft.name}</b>
            </h1>
            <p className='text-lg'>
              {nft.details.description}
            </p>
          </div>
          <img
            src={nft.details.image}
            className='shadow rounded-lg max-w-full h-auto border-none block'
          ></img>
        </div>
        <div className='px-4 pr-10 pl-10'>
          <div className='hidden lg:block xl:block 2xl:block'>
            <h1 className='lg:text-4xl  md:text-3xl text-2xl'>
              <b>{nft.name}</b>
            </h1>
            <p className='text-lg'>
            {nft.details.description}
            </p>
          </div>
          <div className='mt-8 grid gap-6 grid-cols-2'>
            
            {/* Throw the NFT attributes list here */}
            {[...Array(8)].map(()=>(
              <div className='px-4 py-4 rounded border border-[#383838]'>
              <h1 className='text-gray-400 uppercase'>Trait</h1>
              <p>Attribute</p>
            </div>
            ))}
            
          </div>
        </div>
      </div>
      {/* END OF NFT Area */}

      {/* Make offer buy now */}
      <div className='flex justify-center lg:px-6 mt-10 mb-10'>
        <div className='mx-4 mr-8 w-full rounded-lg flex items-stretch bg-[#282828]'>
          {/* Hidden area if screen too small  */}
          <div className='p-4 hidden md:block grow'>
            <p className='text-gray-400'>OWNER</p>
            <div className='mt-1'>
              <img
                src='https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg'
                className='object-contain rounded-full m-1 mr-2 inline-block h-[24px]'
              />
              <span className='text-lg font-mono'>1234...1234</span>
            </div>
          </div>

          <div className='p-4 grow'>
            <p className='text-gray-400 xs:float-left lg:float-none'>PRICE</p>
            <p className='md:text-xl lg:text-3xl text-base'>
              <b>{solSymbol} 1.5</b>
            </p>
          </div>

          <div className='p-4 text-center grow'>
            <button className='h-10 md:h-16 lg:h-16 px-10 w-52 mb-2 lg:mb-0 sm:mr-4  text-sm md:text-xl text-white transition-colors duration-150 bg-black rounded-full focus:shadow-outline hover:bg-black'>
              Make Offer
            </button>
            <button className='h-10 md:h-16 lg:h-16 px-10 w-52  text-sm md:text-xl text-black transition-colors duration-150 bg-white rounded-full focus:shadow-outline hover:bg-white'>
              Buy Now
            </button>
          </div>
        </div>
      </div>
      {/* END Make offer buy now */}

      {/* OFFERS SECTION */}
      <div className='flex justify-between px-10 mt-10 mb-10 text-sm sm:text-base md:text-lg '>
        <div className='w-full pr-6'>
          <h1 className='text-xl md:text-2xl'>
            <b>Offers</b>
          </h1>

          <div className='text-gray-400 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4 p-4'>
            <div className=''>FROM</div>
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
            <div className=''>{solSymbol} 75</div>
            <div className=''>3 hours ago</div>
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

      {/* ACTIVITIES SECTION */}
      <div className='flex justify-between px-10 mt-10 mb-10 text-sm sm:text-base md:text-lg '>
        <div className='w-full pr-6'>
          <h1 className='text-xl md:text-2xl'>
            <b>Activities</b>
          </h1>

          <div className='text-gray-400 grid grid-cols-4 p-4'>
            <div>EVENT</div>
            <div>WALLETS</div>
            <div>PRICE</div>
            <div>WHEN</div>
          </div>

          <div className='grid grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]'>
            <div>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1'
                className='feather feather-dollar-sign float-left  pt-1'
              >
                <line x1='12' y1='1' x2='12' y2='23'></line>
                <path d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'></path>
              </svg>
              <span>Listed</span>
            </div>
            <div>
              <img
                src='https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg'
                className='object-contain rounded-full mr-2 inline-block h-[30px]'
              />
              <span>@skelly</span>
            </div>
            <div>{solSymbol} 75</div>
            <div>3 hours ago</div>
          </div>

          <div className='grid grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]'>
            <div>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1'
                className='feather feather-dollar-sign float-left  pt-1'
              >
                <line x1='12' y1='1' x2='12' y2='23'></line>
                <path d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'></path>
              </svg>
              <span>Listed</span>
            </div>
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

          <div className='grid grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]'>
            <div>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1'
                className='feather feather-tag float-left mr-1 pt-1'
              >
                <path d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z'></path>
                <line x1='7' y1='7' x2='7.01' y2='7'></line>
              </svg>
              <span>Sold</span>
            </div>

            <div className='inline-block'>
              <p>
                <span>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1'
                    className='inline-block feather feather-corner-up-right'
                  >
                    <polyline points='15 14 20 9 15 4'></polyline>
                    <path d='M4 20v-7a4 4 0 0 1 4-4h12'></path>
                  </svg>
                </span>
                damien.sol
              </p>
              <p>
                <span>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1'
                    className='feather feather-corner-down-right inline-block'
                  >
                    <polyline points='15 10 20 15 15 20'></polyline>
                    <path d='M4 4v7a4 4 0 0 0 4 4h12'></path>
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
      {/* END OF ACTIVITIES SECTION */}
    </div>
  )
}

export default Nft
