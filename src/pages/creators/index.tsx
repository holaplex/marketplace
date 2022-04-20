import { gql, useQuery } from '@apollo/client'
import { useWallet } from '@solana/wallet-adapter-react'
import { NextPage, NextPageContext } from 'next'
import { AppProps } from 'next/app'
import Head from 'next/head'
import { equals, isNil, length, map, pipe, prop } from 'ramda'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../client'
import WalletPortal from '../../components/WalletPortal'
import { truncateAddress } from '../../modules/address'
import { AttributeFilter, Marketplace, PresetNftFilter } from '../../types.d'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

const GET_CREATORS_PREVIEW = gql`
  query GetCretorsPreview($subdomain: String!) {
    marketplace(subdomain: $subdomain) {
      subdomain
      ownerAddress
      creators {
        creatorAddress
        storeConfigAddress
        twitterHandle
        nftCount
        preview {
          address
          image
        }
        profile {
          handle
          profileImageUrl
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

  const [hasMore, setHasMore] = useState(true)

  const loading = creatorsQuery.loading

  return (
    <div className="flex flex-col items-center text-white bg-gray-900">
      <Head>
        <title>{`${marketplace.name} Creators`}</title>
        <link rel="icon" href={marketplace.logoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={marketplace.name} />
        <meta property="og:title" content={`${marketplace.name} Creators`} />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-8 md:gap-10 lg:gap-14 gap-y-14 mb-20">
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
                  key={creator.creatorAddress}
                  to={`/creators/${creator.creatorAddress}`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center mb-7">
                      <img
                        src={creator.profile?.profileImageUrl}
                        className="object-cover bg-gray-900 rounded-full w-16 h-16 user-avatar"
                      />
                      <div className="flex flex-col ml-3 gap-2">
                        <div>
                          {creator.twitterHandle ? (
                            <span className="font-medium">{`@${creator.twitterHandle}`}</span>
                          ) : (
                            <span className="pubkey">
                              {truncateAddress(creator.creatorAddress)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-300 text-sm">NFTs</span>
                          <span className="text-sm">{creator.nftCount}</span>
                        </div>
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
