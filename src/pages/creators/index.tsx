import { useEffect, useState } from 'react'
import { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import Head from 'next/head'
import { Link } from 'react-router-dom'

import WalletPortal from '../../components/WalletPortal'
import cx from 'classnames'
import {
  isNil,
  map,
  prop,
  equals,
  or,
  partial,
  ifElse,
  always,
  length,
  not,
  when,
  isEmpty,
  pipe,
} from 'ramda'
import { truncateAddress } from '../../modules/address'
import { useWallet } from '@solana/wallet-adapter-react'
import { AppProps } from 'next/app'
import { useForm, Controller } from 'react-hook-form'
import client from '../../client'
import {
  Marketplace,
  Creator,
  Nft,
  PresetNftFilter,
  AttributeFilter,
} from '../../types.d'
import { List } from '.././../components/List'
import { NftCard } from '.././../components/NftCard'
import Button, { ButtonSize } from '../../components/Button'
import { Filter } from 'react-feather'
import { useSidebar } from '../../hooks/sidebar'
import { toSOL } from '../../modules/lamports'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

const GET_CREATORS_PREVIEW = gql`
  query GetCretorsPreview($subdomain: String!) {
    marketplace(subdomain: $subdomain) {
      subdomain
      ownerAddress
      creators {
        creatorAddress
        storeConfigAddress
        preview {
          address
          image
        }
      }
    }
  }
`

export async function getServerSideProps({ req }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'] || SUBDOMAIN

  const response = await client.query<GetMarketplace>({
    fetchPolicy: 'no-cache',
    query: gql`
      query GetMarketplacePage($subdomain: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          logoUrl
          bannerUrl
          description
          creators {
            creatorAddress
            storeConfigAddress
          }
          auctionHouse {
            authority
          }
        }
      }
    `,
    variables: {
      subdomain,
    },
  })

  const {
    data: { marketplace },
  } = response

  if (isNil(marketplace)) {
    return {
      notFound: true,
    }
  }

  if (pipe(length, equals(1))(marketplace.creators)) {
    return {
      redirect: {
        permanent: false,
        destination: `/creators/${marketplace.creators[0].creatorAddress}`,
      },
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

interface GetMarketplaceInfo {
  marketplace: Marketplace
}

interface GetCreatorPreviews {
  marketplace: Marketplace
}

interface CreatorsPageProps extends AppProps {
  marketplace: Marketplace
}

interface NftFilterForm {
  attributes: AttributeFilter[]
  preset: PresetNftFilter
}

const Creators: NextPage<CreatorsPageProps> = ({ marketplace }) => {
  const { publicKey, connected } = useWallet()
  const creators = map(prop('creatorAddress'))(marketplace.creators)

  const creatorsQuery = useQuery<GetCreatorPreviews>(GET_CREATORS_PREVIEW, {
    variables: {
      subdomain: marketplace.subdomain,
    },
  })

  console.log('Creators', creatorsQuery.data)

  const [hasMore, setHasMore] = useState(true)

  const loading = creatorsQuery.loading

  return (
    <div className="flex flex-col items-center text-white bg-gray-900">
      <Head>
        <title>{marketplace.name + ' Creators'}</title>
        <link rel="icon" href={marketplace.logoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={marketplace.name} />
        <meta property="og:title" content={marketplace.name + ' Creators'} />
        <meta property="og:image" content={marketplace.bannerUrl} />
        <meta property="og:description" content={marketplace.description} />
      </Head>
      <div className="relative w-full mb-14">
        <div className="absolute flex items-center w-full justify-between top-[28px]">
          <Link to="/">
            <img
              src={marketplace.logoUrl}
              alt={marketplace.name}
              className="ml-6 border-4 object-cover border-gray-900 bg-gray-900 rounded-full w-16 h-16"
            />
          </Link>
          <div className="absolute flex items-center justify-end right-6">
            {equals(
              publicKey?.toBase58(),
              marketplace.auctionHouse.authority
            ) && (
              <Link
                to="/admin/marketplace/edit"
                className="text-sm cursor-pointer mr-6 hover:underline "
              >
                Admin Dashboard
              </Link>
            )}
            <Link
              to="/creators"
              className="text-sm cursor-pointer mr-6 underline "
            >
              Creators
            </Link>
            <WalletPortal />
          </div>
        </div>
      </div>
      <div className="w-full max-w-[1800px] px-14">
        <div className="mt-20 mb-20">
          <h2>{marketplace.name + ' Creators'}</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 md:gap-10 lg:gap-14 mb-20">
          {loading ? (
            <>
              <div className="hover:translate-sale-1.5">
                <div className="flex flex-grid mb-2">
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                </div>
                <div className="bg-gray-800 h-6 w-24 block" />
              </div>
              <div>
                <div className="flex flex-grid mb-2">
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                  <div className="bg-gray-800 w-1/3 aspect-square" />
                </div>
                <div className="bg-gray-800 h-6 w-24 block" />
              </div>
            </>
          ) : (
            creatorsQuery.data?.marketplace.creators.map((creator) => {
              return (
                <Link
                  className="transition-transform hover:scale-[1.02]"
                  key={creator.storeConfigAddress}
                  to={`/creators/${creator.creatorAddress}`}
                >
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        {/* TODO: Add twitter handle and image. */}
                        {/* <img
                          src={}
                          alt={creator.creatorAddress}
                          className="object-cover bg-gray-900 rounded-full w-12 h-12 mr-2"
                        /> */}
                        <span className="text-sm">
                          {truncateAddress(creator.creatorAddress as string)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        {/* TODO: Add nft counts once the api is updated. */}
                        {/* <span className="text-gray-300 text-sm">NFTs</span>
                        <span className="text-sm"></span> */}
                      </div>
                    </div>
                    <div className="hidden xl:flex w-full flex-grid mb-2 gap-4 overflow-hidden ">
                      {creator.preview.map((nft) => {
                        return (
                          <img
                            className="h-28 object-cover rounded-md grow"
                            src={nft.image}
                            key={nft.address}
                            alt={nft.name}
                          />
                        )
                      })}
                    </div>
                    <div className="flex xl:hidden w-full flex-grid mb-2 gap-4 overflow-hidden ">
                      {creator.preview.slice(0, 2).map((nft) => {
                        return (
                          <img
                            className="h-28 object-cover rounded-md grow"
                            src={nft.image}
                            key={nft.address}
                            alt={nft.name}
                          />
                        )
                      })}
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default Creators
