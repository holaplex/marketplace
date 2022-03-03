import { useEffect } from 'react'
import next, { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import Link from 'next/link'
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import { isNil, map, modify, filter, pipe, prop, isEmpty, not, any } from 'ramda'
import { AppProps } from 'next/app'
import Select from 'react-select'
import { useForm, Controller } from 'react-hook-form'
import { truncateAddress } from './../../modules/address';
import client from '../../client'
import { Marketplace, Creator, Nft } from '../../types';
import { List } from '../../components/List'
import { NftCard } from '../../components/NftCard'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN;

type OptionType = { label: string; value: number };

interface GetNftsData {
  nfts: Nft[]
  creator: Creator
};

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

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'];

  const {
    data: { marketplace, creator },
  } = await client.query<GetCreatorPage>({
    query: gql`
      query GetCreatorPage($subdomain: String!, $creator: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          description
          logoUrl
          bannerUrl
          ownerAddress
          auctionHouse{
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
        creator(address: $creator) {
          attributeGroups {
            name
            variants {
              name
              count
            }
          }
        }
      }
    `,
    variables: {
      subdomain: (subdomain || SUBDOMAIN),
      creator: query.creator,
    },
  })

  if (any(isNil)([marketplace, creator])) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      marketplace,
      creator,
    },
  }
}

interface GetCreatorPage {
  marketplace: Marketplace | null;
  creator: Creator | null;
}

interface CreatorPageProps extends AppProps {
  marketplace: Marketplace
  creator: Creator
}

interface AttributeFilter {
  traitType: string
  values: string[]
}
interface NFTFilterForm {
  attributes: AttributeFilter[]
}
const CreatorShow: NextPage<CreatorPageProps> = ({ marketplace, creator }) => {
  const nfts = useQuery<GetNftsData>(GET_NFTS, {
    variables: {
      creators: [marketplace.ownerAddress],
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

  return (
    <div className='flex flex-col items-center text-white bg-gray-900'>
      <div className='relative w-full'>
        <div className="absolute right-8 top-8">
          <WalletMultiButton>Connect</WalletMultiButton>
        </div>
        <img src={marketplace.bannerUrl} alt={marketplace.name} className='object-cover w-full h-80' />
      </div>
      <div className='w-full max-w-[1800px] px-8'>
        <div className='relative flex flex-col justify-between w-full mt-20 mb-20'>
          <img
            src={marketplace.logoUrl}
            alt={marketplace.name}
            className='absolute border-4 border-gray-900 rounded-full w-28 h-28 -top-32'
          />
          <h1>{marketplace.name}</h1>
          <p className='mt-4 max-w-prose'>{marketplace.description}</p>
        </div>
        <div className='flex'>
          <div className='flex-row flex-none hidden w-80 mr-10 space-y-2 sm:block'>
            <form
              onSubmit={e => {
                e.preventDefault()
              }}
              className='sticky top-0 max-h-screen py-4 overflow-auto'
            >
              <ul className='flex flex-col flex-grow mb-6'>
                <li className='flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800'>
                  <h4>Current listings</h4>
                </li>
                <li className='flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800'>
                  <h4>Owned by me</h4>
                </li>
                <li className='flex justify-between w-full px-4 py-2 mb-1 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-800'>
                  <h4>Unlisted</h4>
                </li>
              </ul>
              <div className="flex flex-row justify-between align-top w-full mb-2">
                <label className="label">Creators</label>
                <Link href="/" passHref>
                  <a>
                    Show All
                  </a>
                </Link>
              </div>
              <ul className="flex flex-col flex-grow mb-6">
                <li className='flex justify-between w-full px-4 py-2 mb-1 rounded-md bg-gray-800 hover:bg-gray-800'>
                  <h4>{truncateAddress(marketplace.ownerAddress)}</h4>
                </li>
              </ul>
              <div className='flex flex-col flex-grow gap-4'>
                {creator.attributeGroups.map(
                  ({ name: group, variants }, index) => (
                    <div className='flex flex-col flex-grow gap-2' key={group}>
                      <label className='label'>
                        {group}
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

                              options={
                                variants.map(({ name, count }) => ({
                                  value: name,
                                  label: `${name} (${count})`,
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
            <List
              grid={{
                xs: {
                  cols: 1,
                  gap: 8,
                },
                md: {
                  cols: 2,
                  gap: 8,
                },
                lg: {
                  cols: 3,
                  gap: 8,
                },
                xl: {
                  cols: 4,
                  gap: 8
                },
              }}
              data={nfts.data?.nfts}
              loading={nfts.loading}
              loadingComponent={<NftCard.Skeleton />}
              emptyComponent={(
                <div className='w-full p-10 text-center border border-gray-800 rounded-lg'>
                  <h3>No NFTs found</h3>
                  <p className='mt- text-gray-500'>No NFTs found matching these criteria.</p>
                </div>
              )}
              itemRender={(nft) => {
                return (
                  <Link passHref href={`/nfts/${nft.address}`} key={nft.address}>
                    <a>
                      <NftCard nft={nft} />
                    </a>
                  </Link>
                )
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatorShow
