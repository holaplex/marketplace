import { useEffect } from 'react'
import next, { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import Link from 'next/link'
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import { isNil } from 'ramda'
import { truncateAddress } from '../modules/address';
import { AppProps } from 'next/app'
import { useForm } from 'react-hook-form'
import client from '../client'
import { Marketplace, Creator, Nft } from '../types';
import { List } from './../components/List';
import  { NftCard } from './../components/NftCard';

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

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
      listings {
        address
        auctionHouse
        price
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

  const { control, watch } = useForm<NFTFilterForm>({})

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
              <label className="label mb-2">Creators</label>
              <ul className="flex flex-col flex-grow mb-6">
                <li>
                  <Link href={`/creators/${marketplace.ownerAddress}`}>
                    <a className='flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800'>
                      <h4>{truncateAddress(marketplace.ownerAddress)}</h4>
                    </a>
                  </Link>
                </li>
              </ul>
            </form>
          </div>
          <div className='grow'>
            <List
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
                      <NftCard nft={nft} marketplace={marketplace} />
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

export default Home
