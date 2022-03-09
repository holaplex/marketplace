import { useEffect } from 'react'
import { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import Link from 'next/link'
import WalletPortal from '../components/WalletPortal';
import cx from 'classnames';
import { isNil, map, prop, equals, ifElse, always } from 'ramda'
import { truncateAddress } from '../modules/address';
import { useWallet } from '@solana/wallet-adapter-react';
import { AppProps } from 'next/app'
import { useForm, Controller } from 'react-hook-form'
import client from '../client'
import { Marketplace, Creator, Nft, PresetNftFilter, AttributeFilter, MarketplaceCreator } from '../types.d';
import { List } from './../components/List';
import { NftCard } from './../components/NftCard';

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

interface GetNftsData {
  nfts: Nft[]
  creator: Creator
}

const GET_NFTS = gql`
  query GetNfts($creators: [PublicKey!]!, $owners: [PublicKey!], $listed: [PublicKey!]) {
    nfts(creators: $creators, owners: $owners, listed: $listed) {
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

  const response = await client.query<GetMarketplace>({
    fetchPolicy: 'no-cache',
    query: gql`
      query GetMarketplace($subdomain: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          description
          logoUrl
          bannerUrl
          ownerAddress
          creators {
            creatorAddress
          }
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

  const { data: { marketplace } } = response;

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

interface NftFilterForm {
  attributes: AttributeFilter[];
  preset: PresetNftFilter;
}

const Home: NextPage<HomePageProps> = ({ marketplace }) => {
  const { publicKey, connected } = useWallet();
  const creators = map(prop('creatorAddress'))(marketplace.creators);

  const nfts = useQuery<GetNftsData>(GET_NFTS, {
    variables: {
      creators,
    },
  })

  const { watch, register, control } = useForm<NftFilterForm>({
    defaultValues: { preset: PresetNftFilter.All }
  });

  useEffect(() => {
    const subscription = watch(({ preset }) => {
      const pubkey = publicKey?.toBase58();

      const owners = ifElse(
        equals(PresetNftFilter.Owned),
        always([pubkey]),
        always(null),
      )(preset as PresetNftFilter);

      const listed = ifElse(
        equals(PresetNftFilter.Listed),
        always([marketplace.auctionHouse.address]),
        always(null),
      )(preset as PresetNftFilter);

      nfts.refetch({
        creators,
        owners,
        listed,
      });
    })
    return () => subscription.unsubscribe()
  }, [watch, publicKey, marketplace]);


  return (
    <div className='flex flex-col items-center text-white bg-gray-900'>
      <div className='relative w-full'>
        <div className="absolute right-6 top-[25px]">
          <WalletPortal />
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
          <div className='flex-row flex-none hidden mr-10 space-y-2 w-80 sm:block'>
            <form
              onSubmit={e => {
                e.preventDefault()
              }}
              className='sticky top-0 max-h-screen py-4 overflow-auto'
            >
              <ul className='flex flex-col flex-grow mb-6'>
                <li>
                  <Controller
                    control={control}
                    name="preset"
                    render={({ field: { value, onChange } }) => (
                      <label
                        htmlFor="preset-all"
                        className={
                          cx(
                            "flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800",
                            { "bg-gray-800": equals(PresetNftFilter.All, value) }
                          )
                        }
                      >
                        <input
                          onChange={onChange}
                          className="hidden"
                          type="radio"
                          name="preset"
                          value={PresetNftFilter.All}
                          id="preset-all"
                        />
                        All
                      </label>
                    )}
                  />
                </li>
                <li>
                <Controller
                    control={control}
                    name="preset"
                    render={({ field: { value, onChange } }) => (
                      <label
                        htmlFor="preset-listed"
                        className={
                          cx(
                            "flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800",
                            { "bg-gray-800": equals(PresetNftFilter.Listed, value) }
                          )
                        }
                      >
                        <input
                          onChange={onChange}
                          className="hidden"
                          type="radio"
                          name="preset"
                          value={PresetNftFilter.Listed}
                          id="preset-listed"
                        />
                        Listed for sale
                      </label>
                    )}
                  />
                </li>
                {connected && (
                  <li>
                <Controller
                    control={control}
                    name="preset"
                    render={({ field: { value, onChange } }) => (
                      <label
                        htmlFor="preset-owned"
                        className={
                          cx(
                            "flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800",
                            { "bg-gray-800": equals(PresetNftFilter.Owned, value) }
                          )
                        }
                      >
                        <input
                          onChange={onChange}
                          className="hidden"
                          type="radio"
                          name="preset"
                          value={PresetNftFilter.Owned}
                          id="preset-owned"
                        />
                        Owned by me
                      </label>

                    )}
                  />
                  </li>
                )}
              </ul>
              <label className="mb-2 label">Creators</label>
              <ul className="flex flex-col flex-grow mb-6">
                {creators.map((creator) => (
                  <li key={creator}>
                    <Link href={`/creators/${creator}`}>
                      <a className='flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800'>
                        <h4>{truncateAddress(creator)}</h4>
                      </a>
                    </Link>
                  </li>
                ))}
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
                  <p className='text-gray-500 mt-'>No NFTs found matching these criteria.</p>
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
