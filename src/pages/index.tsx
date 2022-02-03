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
import { NftCard } from '../components/NftCard'

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

  return (
    <div className='text-white bg-black app-wrapper'>
      <div
        className='relative flex items-start justify-end p-6 bg-center bg-cover h-60'
        style={{ backgroundImage: `url(${storefront.bannerUrl})` }}
      >
        <div className='flex items-center justify-end gap-6'>
          <WalletMultiButton />
          <WalletDisconnectButton />
        </div>
        <Link href='/'>
          <a
            className='absolute h-20 bg-black bg-center bg-cover rounded-full -bottom-10 left-6 aspect-square'
            style={{ backgroundImage: `url(${storefront.logoUrl})` }}
          ></a>
        </Link>
      </div>
      <div className='flex justify-between px-6 mt-20 mb-10'>
        <div className='flex-col'>
          <h1 className='text-2xl'>{storefront.title}</h1>
          <p>{storefront.description}</p>
        </div>
      </div>
      <div className='container flex'>
        <div className='flex-col flex-none px-6 space-y-2 w-72'>
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
                    <label>{group}</label>
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
            <ul className='grid grid-cols-4 gap-6'>
              {nfts.data?.nfts.map(n => (
                <li key={n.address}>
                  <div className='p-4 h-68 overflow-clip hover:bg-gray'>
                    <Link href={'/nfts/' + n.address}>
                    <a>
                      <img
                        src={n.image as string}
                        alt='nft image'
                        className='object-fill h-56 pb-2 rounded-lg'
                      />
                      <div className='grid grid-cols-2 gap-2'>
                        <div>
                          <p>{n.name}</p>
                        </div>
                        <div className=''>
                          <p className='text-right'>55 {solSymbol}</p>
                          <p className='text-right'>Buy Now</p>
                        </div>
                      </div>
                    </a>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
