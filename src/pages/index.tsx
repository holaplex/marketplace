import { useState } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { gql, useQuery } from '@apollo/client'
import { isCompositeType } from 'graphql'

import { NFTCard } from '../components/NFTCard'
interface Nft {
  name: String
  uri: String
  creators: Array<String>
}

interface GetNftsData {
  nfts: Nft[]
}

interface NftCard {
  name: String
  collection: String
  creators: Array<String>
}

const creators_list = [
  '232PpcrPc6Kz7geafvbRzt5HnHP4kX88yvzUCN69WXQC',
  '58NaH44cJkYttSnAqUwe6WYMABYoEQ2JnmoYaukDBf6M',
]

const GET_NFTS = gql`
  query GetNfts($creators: [String!]) {
    nfts(creators: $creators) {
      creators
      name
      uri
    }
  }
`

const Home: NextPage = () => {
  const { data, loading } = useQuery<GetNftsData>(GET_NFTS, {
    variables: { creators: creators_list },
  })

  const [walletSelected, setWalletSelected] = useState<String>('')
  const [searchString, setSearchString] = useState<String>('')


  return loading ? (
    <>Loading</>
  ) : (
    //  Div parent container
    <div className='md:container md:mx-auto'>
      <div id='bodyContainer' className='grid grid-cols-5 gap-3'>
        <div id='mainLeft'>
          <div id='buttonContainer' className='w-full'>
            <button className='w-full bg-[#292929] hover:bg-gray-400 text-white-600 font-bold py-2 px-4 rounded inline-flex items-center mb-2'>
              <svg
                className='fill-current w-4 h-4 mr-2'
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 20 20'
              >
                <path d='M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z' />
              </svg>
              <span>Download</span>
            </button>

            <button className='bg-[#171717] w-full bg-gray-300 hover:bg-gray-400 text-white-600 font-bold py-2 px-4 rounded inline-flex items-center mb-2'>
              <svg
                className='fill-current w-4 h-4 mr-2'
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 20 20'
              >
                <path d='M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z' />
              </svg>
              <span>Download</span>
            </button>

            <button className='bg-[#171717] w-full bg-gray-300 hover:bg-gray-400 text-white-600 font-bold py-2 px-4 rounded inline-flex items-center mb-2'>
              <svg
                className='fill-current w-4 h-4 mr-2'
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 20 20'
              >
                <path d='M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z' />
              </svg>
              <span>Download</span>
            </button>
          </div>
          <div id='creatorsFilterContainer'>

            <div id='buttonContainer' className='w-full'>
              <div
              className='w-full'
                id={'div_'}
                style={{ marginBottom: '5px' }}
                onClick={e => {
                  setWalletSelected(e.currentTarget.id.split('_')[1])
                }}
              >
                <button className='w-full bg-[#383838]  hover:bg-gray-400 text-white-600 font-bold py-2 px-4 rounded inline-flex items-center  mb-2'>
                  <span className='text-sm'>All Creators</span>
                </button>
              </div>
              {creators_list.map(c => (
                <div
                  className='w-full'
                  id={'div_' + c}
                  style={{ marginBottom: '5px' }}
                  onClick={e => {
                    setWalletSelected(e.currentTarget.id.split('_')[1])
                  }}
                >
                  <button className='w-full bg-[#171717] hover:bg-[#383838]   font-bold py-2 px-4 rounded inline-flex items-center mb-2'>
                    <img
                      src='https://st4.depositphotos.com/1000507/24488/v/600/depositphotos_244889634-stock-illustration-user-profile-picture-isolate-background.jpg'
                      width={50}
                      height={50}
                      style={{ display: 'inline-block', marginRight: '2px' }}
                      className='rounded-full'
                    />
                    <div className=''>
                      <div className='text-sm text-white-600'>{c.substring(0, 4) + '...' + c.slice(-4)}</div>
                      <div className='text-xs text-white-300'>1 collection - 11 NFTs</div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div id='mainRight' className='col-span-4'>
          {/* Search, options, buttons */}
          <div className='w-full' >
            <div className='relative text-gray-600 focus-within:text-gray-400'>
              <span className='absolute inset-y-0 left-0 flex items-center pl-2'>
                <button className='p-1 focus:outline-none focus:shadow-outline'>
                  <svg
                    fill='none'
                    stroke='currentColor'
                    stroke-linecap='round'
                    stroke-linejoin='round'
                    stroke-width='2'
                    viewBox='0 0 24 24'
                    className='w-6 h-6'
                  >
                    <path d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'></path>
                  </svg>
                </button>
              </span>
              <input
                className='py-2 w-8/12 text-sm text-gray-900 bg-[#171717] border-[#373737] rounded-md pl-10 focus:outline-none '
                placeholder='Search...'
              />
              <select
                className='bg-[#222222] form-select px-3 py-2 ml-1 mr-1 rounded-md text-sm  border-[#292929] bg-clip-padding bg-no-repeat rounded transition ease-in-out m-0'
                aria-label='Default select example'
              >
                <option className='text-white-600'>Recently Added</option>
                <option className='text-white-600'>Recently Added</option>
              </select>

              <span>
                <button className='bg-[#222222] border-[#292929] color-white-600 hover:bg-gray-400 font-bold py-1.5 px-4 rounded-l'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-6 w-6'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      stroke-linecap='round'
                      stroke-linejoin='round'
                      stroke-width='2'
                      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7'
                    />
                  </svg>
                </button>
                <button className='bg-[#222222] color-white-600 border-[#292929] hover:bg-gray-400  font-bold py-1.5 px-4 rounded-r'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-6 w-6'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      stroke-linecap='round'
                      stroke-linejoin='round'
                      stroke-width='2'
                      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7'
                    />
                  </svg>
                </button>
              </span>
            </div>
          </div>

          {/* This is where the body cards load */}
          <div className='pt-4 grid grid-cols-4 gap-4'>
            {data?.nfts
              .filter((v, idx) => {
                if (
                  (walletSelected == '' ||
                    v.creators.includes(String(walletSelected))) &&
                  (searchString == '' ||
                    v.name
                      .toLocaleLowerCase()
                      .includes(String(searchString).toLocaleLowerCase()))
                ) {
                  return v
                }
              })
              .map(({ name, creators, uri }) => (
                <NFTCard name={name} creators={creators} />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
