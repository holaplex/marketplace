import { useEffect } from 'react'
import next, { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import Link from 'next/link'
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import { isNil, map, modify, filter, pipe, prop, isEmpty, not } from 'ramda'
import { AppProps } from 'next/app'
import Select from 'react-select'
import { useForm, Controller } from 'react-hook-form'
import client from '../client'
import { useState } from 'react'
import { Marketplace, Creator, Nft } from '../types';

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

type OptionType = { label: string; value: number }

interface GetNftsData {
  nfts: Nft[]
  creator: Creator
}

const GET_NFTS = gql`
  query GetNfts($creators: [String!]!, $attributes: [AttributeFilter!]) {
    nfts(creators: $creators, attributes: $attributes) {
      address
      name
      description
      image
    }
  }
`

const GET_SIDEBAR = gql`
  query GetSidebar($address: String!) {
    creator(address: $address) {
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

export async function getServerSideProps({ req }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'];

  const {
    data: { marketplace },
  } = await client.query<GetMarketplace>({
    query: gql`
      query GetMarketplace($subdomain: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          description
          logoUrl
          bannerUrl
          auctionHouseAddress
          ownerAddress
        }
      }
    `,
    variables: {
      subdomain: (subdomain || SUBDOMAIN),
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
    },
  }
}

interface GetMarketplace {
  marketplace: Marketplace | null
}

interface GetSidebar {
  creator: Creator
}

interface HomePageProps extends AppProps {
  marketplace: Marketplace
}

interface AttributeFilter {
  traitType: string
  values: string[]
}
interface NFTFilterForm {
  attributes: AttributeFilter[]
}
const Home: NextPage<HomePageProps> = ({ marketplace }) => {
  const nfts = useQuery<GetNftsData>(GET_NFTS, {
    variables: {
      creators: [marketplace.ownerAddress],
    },
  })

  const sidebar = useQuery<GetSidebar>(GET_SIDEBAR, {
    variables: {
      address: marketplace.ownerAddress,
    },
  })

  const { control, watch } = useForm<NFTFilterForm>({})

  useEffect(() => {
    const subscription = watch(({ attributes }) => {
      const next = pipe(
        filter(pipe(prop('values'), isEmpty, not)),
        map(modify('values', map(prop('value'))))
      )(attributes)

      nfts.refetch({
        creators: [marketplace.ownerAddress],
        attributes: next,
      })
    })
    return () => subscription.unsubscribe()
  }, [watch])

  const [showXsFilter, setShowXsFilter] = useState(false)

  return (
    <div className='flex flex-col items-center text-white bg-gray-900'>
      {showXsFilter && (
        <div className='fixed z-20 w-full h-full px-4 py-4 pt-24 bg-black'>
          <button
            className='fixed z-30 right-[7%] top-[3%] bg-black text-white rounded-full w-6'
            onClick={() => setShowXsFilter(false)}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='50'
              height='50'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='0.5'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='feather feather-x-circle'
            >
              <circle cx='12' cy='12' r='10'></circle>
              <line x1='15' y1='9' x2='9' y2='15'></line>
              <line x1='9' y1='9' x2='15' y2='15'></line>
            </svg>
          </button>
          <form
            onSubmit={e => {
              e.preventDefault()
            }}
          >
            <div className='flex flex-col flex-grow mb-6'>
              <div className='flex justify-between w-full p-2 rounded-md'>
                <h4>Current listings</h4>
                <span className='text-sm text-gray-500'>0</span>
              </div>
              <div className='flex justify-between w-full p-2 rounded-md'>
                <h4>Owned by me</h4>
                <span className='text-sm text-gray-500'>0</span>
              </div>
              <div className='flex justify-between w-full p-2 bg-gray-800 rounded-md'>
                <h4>Unlisted</h4>
                <span className='text-sm text-gray-500'>0</span>
              </div>
            </div>
            <div className='flex flex-col flex-grow gap-4'>
              {sidebar.data?.creator.attributeGroups.map(
                ({ name: group, variants }, index) => (
                  <div className='flex flex-col flex-grow gap-2' key={group}>
                    <label>
                      {group.charAt(0).toUpperCase() + group.slice(1)}
                    </label>
                    <Controller
                      control={control}
                      name={`attributes.${index}`}
                      defaultValue={{ traitType: group, values: [] }}
                      render={({ field: { onChange, value } }) => {
                        return (
                          <Select
                            value={value.values}
                            isMulti
                            className='select-base-theme'
                            classNamePrefix='base'
                            onChange={(next: ValueType<OptionType>) => {
                              onChange({ traitType: group, values: next })
                            }}
                            formatOptionLabel={(elem: ValueType<OptionType>) =>
                              elem.label
                                .split(' ')
                                .slice(0, -1)
                                .join(' ') +
                              ' (' +
                              elem.label.split(' ').at(-1) +
                              ')'
                            }
                            options={
                              variants.map(({ name, count }) => ({
                                value: name,
                                label: `${name} ${count}`,
                              })) as OptionsType<OptionType>
                            }
                          />
                        )
                      }}
                    />
                  </div>
                )
              )}
            </div>
          </form>
        </div>
      )}

      <div className='relative w-full'>
        <div className="absolute right-8 top-8">
          <WalletMultiButton>Connect</WalletMultiButton>
        </div>

        <img src={marketplace.bannerUrl} alt={marketplace.title} className='object-cover w-full h-80' />
      </div>

      <div className='w-full max-w-[1800px] px-8'>

        <div className='relative flex flex-col justify-between w-full mt-20 mb-20'>
          <img
            src={marketplace.logoUrl}
            alt={marketplace.title}
            className='absolute border-4 border-gray-900 rounded-full w-28 h-28 -top-32'
          />
          <h1>{marketplace.title}</h1>
          <p className='mt-4 max-w-prose'>{marketplace.description}</p>
        </div>

        <div className='flex'>
          <button
            className='fixed rounded-full text-black bg-white h-10 right-[25%] w-[50%] z-10 block sm:hidden bottom-5'
            onClick={() => setShowXsFilter(true)}
          >
            Filter
          </button>

          <div className='flex-row flex-none hidden w-64 mr-10 space-y-2 sm:block'>
            <form
              onSubmit={e => {
                e.preventDefault()
              }}
              className='sticky top-0 py-4 max-h-screen overflow-auto'
            >
              <div className='flex flex-col flex-grow mb-6'>
                <div className='flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800'>
                  <h4>Current listings</h4>
                  <span className='text-sm text-gray-500'>0</span>
                </div>
                <div className='flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800'>
                  <h4>Owned by me</h4>
                  <span className='text-sm text-gray-500'>0</span>
                </div>
                <div className='flex justify-between w-full px-4 py-2 mb-1 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-800'>
                  <h4>Unlisted</h4>
                  <span className='text-sm text-gray-500'>0</span>
                </div>
              </div>
              <div className='flex flex-col flex-grow gap-4'>
                {sidebar.data?.creator.attributeGroups.map(
                  ({ name: group, variants }, index) => (
                    <div className='flex flex-col flex-grow gap-2' key={group}>
                      <label className='label'>
                        {group.charAt(0).toUpperCase() + group.slice(1)}
                      </label>

                      <Controller
                        control={control}
                        name={`attributes.${index}`}
                        defaultValue={{ traitType: group, values: [] }}
                        render={({ field: { onChange, value } }) => {
                          return (
                            <Select
                              value={value.values}
                              isMulti
                              className='select-base-theme'
                              classNamePrefix='base'
                              onChange={(next: ValueType<OptionType>) => {
                                onChange({ traitType: group, values: next })
                              }}
                              formatOptionLabel={(
                                elem: ValueType<OptionType>
                              ) =>
                                elem.label
                                  .split(' ')
                                  .slice(0, -1)
                                  .join(' ') +
                                ' (' +
                                elem.label.split(' ').at(-1) +
                                ')'
                              }
                              options={
                                variants.map(({ name, count }) => ({
                                  value: name,
                                  label: `${name} ${count}`,
                                })) as OptionsType<OptionType>
                              }
                            />
                          )
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            </form>
          </div>
          <div className='grow'>
            {nfts.loading ? (
              <>Loading</>
            ) : (
              <div className='container md:mx-auto lg:mx-auto'>
                {nfts.data?.nfts.length === 0 &&
                  <div className='w-full p-10 text-center border border-gray-800 rounded-lg'>
                    <h3>No NFTs found</h3>
                    <p className='mt-2 text-gray-500'>No NFTs found matching these criteria.</p>
                  </div>
                }
                <div className='grid grid-cols-1 gap-8 mb-20 md:mb-0 2xl:gap-12 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {nfts.data?.nfts.map(nft => {
                    const listingType = 'buyNow';

                    return (
                      <Link passHref href={`/nfts/${nft.address}`} key={nft.address}>
                      <a>
                        <article className='overflow-hidden rounded-lg transition duration-100 transform cursor-pointer bg-gray-900 shadow-card	hover:scale-[1.02]'>
                          <img
                            alt='Placeholder'
                            className='block w-full aspect-square'
                            src={nft.image as string}
                          />
                          <header className='p-4'>
                            <h4 className='lg:text-base mb-2 text-sm truncate ...'>
                              {nft.name}
                            </h4>
                            <div className='flex items-center'>
                              <img src={nft.image as string} className='h-4 w-4 rounded-full bg-gray-800 m-0 outline-none mr-1' />
                              <label className='label truncate ...'>TODO: Creator Name and avatar</label>
                            </div>
                          </header>
                          {listingType === 'buyNow' &&
                            <footer className='flex gap-2 h-20 items-center px-4'>
                              <div className='flex-1 mr-auto'>
                                <p className='label'>Price</p>
                                <p className='font-semibold icon-sol'>12</p>
                              </div>
                              <div className='button small grow-0'>Buy Now</div>
                            </footer>
                          }
                          {listingType === 'unlisted' &&
                            <footer className='grid h-20 items-center px-4'>
                              <div>
                                <p className='label'>Last Price</p>
                                <p className='font-semibold icon-sol text-gray-300'>12</p>
                              </div>
                            </footer>
                          }
                          {listingType === 'neverListed' &&
                            <footer className='grid h-20 items-center px-4'>
                              <div>
                                <p className='label'>Minted</p>
                                <p className='label text-sm'>6 days ago</p>
                              </div>
                            </footer>
                          }
                        </article>
                      </a>
                    </Link >
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
