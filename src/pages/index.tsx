import { useEffect } from 'react'
import next, { NextPage } from 'next'
import { gql, useQuery } from '@apollo/client'
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import { isNil, modify, map, filter, pipe, prop, isEmpty, not } from 'ramda'
import { AppProps } from 'next/app'
import Link from 'next/link'
import Select, { OptionsType, ValueType } from 'react-select'
import { useForm, Controller } from 'react-hook-form'
import client from '../client'
import { useState } from 'react'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

type OptionType = { label: string; value: number }
const solSymbol = '◎'

interface Nft {
  name: string
  address: string
  uri: string
  creators: string[]
  description: string
  image: string
}

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

export async function getServerSideProps () {
  const {
    data: { storefront },
  } = await client.query<GetStorefront>({
    query: gql`
      query GetStorefront($subdomain: String!) {
        storefront(subdomain: $subdomain) {
          title
          description
          logoUrl
          faviconUrl
          bannerUrl
          ownerAddress
        }
      }
    `,
    variables: {
      subdomain: SUBDOMAIN,
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
    },
  }
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

interface AttributeVariant {
  name: string
  count: number
}
interface AttributeGroup {
  name: string
  variants: AttributeVariant[]
}

interface Creator {
  addresss: string
  attributeGroups: AttributeGroup[]
}

interface GetStorefront {
  storefront: Storefront | null
}

interface GetSidebar {
  creator: Creator
}

interface HomePageProps extends AppProps {
  storefront: Storefront
}

interface AttributeFilter {
  traitType: string
  values: string[]
}
interface NFTFilterForm {
  attributes: AttributeFilter[]
}
const Home: NextPage<HomePageProps> = ({ storefront }) => {
  const nfts = useQuery<GetNftsData>(GET_NFTS, {
    variables: {
      creators: [storefront.ownerAddress],
    },
  })

  const sidebar = useQuery<GetSidebar>(GET_SIDEBAR, {
    variables: {
      address: storefront.ownerAddress,
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
        creators: [storefront.ownerAddress],
        attributes: next,
      })
    })
    return () => subscription.unsubscribe()
  }, [watch])

  const [showXsFilter, setShowXsFilter] = useState(false)

  return (
    <div className='text-white bg-gray-900'>
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
                <span>0</span>
              </div>
              <div className='flex justify-between w-full p-2 rounded-md'>
                <h4>Owned by me</h4>
                <span>0</span>
              </div>
              <div className='flex justify-between w-full p-2 bg-gray-800 rounded-md'>
                <h4>Unlisted</h4>
                <span>0</span>
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
      <div
        className='relative flex items-start justify-end p-6 bg-center bg-cover h-60'
        style={{ backgroundImage: `url(${storefront.bannerUrl})` }}
      >
        <div className='flex items-center justify-end gap-6'>
          <WalletMultiButton>Connect</WalletMultiButton>
        </div>
        <Link href='/'>
          <a
            className='absolute h-24 bg-black bg-center bg-cover rounded-full -bottom-12 left-6 aspect-square border-4 border-black'
            style={{ backgroundImage: `url(${storefront.logoUrl})` }}
          ></a>
        </Link>
      </div>
      <div className='flex justify-between px-6 mt-20 mb-10'>
        <div className='flex-col'>
          <h1>{storefront.title}</h1>
          <p className='mt-4'>{storefront.description}</p>
        </div>
      </div>
      <div className='w-full pr-4 md:pr-8 lg:pr-8  xs:mb-[75px]'>
        <div className='flex'>
          <button
            className='fixed rounded-full text-black bg-white h-10 right-[25%] w-[50%] z-10 block sm:hidden md:hidden lg:hidden xl:hidden 2xl:hidden bottom-5'
            onClick={() => setShowXsFilter(true)}
          >
            Filter
          </button>
          <div className='flex-row flex-none hidden px-6 space-y-2 w-72 sm:block md:block lg:block xl:block 2xl:block'>
            <form
              onSubmit={e => {
                e.preventDefault()
              }}
            >
              <div className='flex flex-col flex-grow mb-6'>
                <div className='flex justify-between w-full p-2 rounded-md'>
                  <h4>Current listings</h4>
                  <span>0</span>
                </div>
                <div className='flex justify-between w-full p-2 rounded-md'>
                  <h4>Owned by me</h4>
                  <span>0</span>
                </div>
                <div className='flex justify-between w-full p-2 bg-gray-800 rounded-md'>
                  <h4>Unlisted</h4>
                  <span>0</span>
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
          <div className='ml-4 grow'>
            {nfts.loading ? (
              <>Loading</>
            ) : (
              <div className='container md:mx-auto lg:mx-auto'>
                <div className='flex flex-wrap -mx-1 lg:-mx-4'>
                  {nfts.data?.nfts.map(n => (
                    <div className='w-full px-1 my-1 md:w-1/2 md:pb-2 md:px-2 lg:mb-4 lg:px-2 lg:w-1/3 xl:w-1/4 2xl:w-1/5'>
                      <Link href={'/nfts/' + n.address}>
                        <article className='overflow-hidden rounded-lg transition duration-300 transform hover:scale-[1.02]'>
                          <div className='h-[300px] overflow-hidden'>
                            <img
                              alt='Placeholder'
                              className='block w-full h-full'
                              src={n.image as string}
                            />
                          </div>
                          <header className='p-4 border border-t-0 border-b-0 border-[#262626]'>
                            <p className='lg:text-base mb-2 text-sm truncate ...'>
                              {n.name}
                            </p>
                            <p className='text-sm text-[#a8a8a8]'>
                              <span>
                                {' '}
                                <img
                                  src={storefront.logoUrl}
                                  className='object-fill rounded-sm inline-block h-[20px] mr-2'
                                />
                              </span>
                              {storefront.title}
                            </p>
                          </header>

                          <footer className='grid grid-cols-2 gap-2 p-4 bg-[#262626] rounded-t-none rounded-b-lg'>
                            <div>
                              <p className='text-[#a8a8a8] text-sm'>
                                Current Bid
                              </p>
                              <p className='text-sm'>{solSymbol} 33</p>
                            </div>
                            <div>
                              <p className='text-right text-[#a8a8a8] text-sm'>
                                Ends In
                              </p>
                              <p className='text-sm text-right '>19h 48m 53s</p>
                            </div>
                          </footer>
                        </article>
                      </Link>
                    </div>
                  ))}
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
