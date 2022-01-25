import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { gql, useQuery } from '@apollo/client'
import {
  WalletDisconnectButton,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { isNil } from 'ramda';
import { AppProps } from 'next/app';
import Link from 'next/link'
import client from '../../client';

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN;

interface Nft {
  name: string
  address: string
  details: {
      image: string
      description: string
      creators: [string]
      properties: {
          name: string
          value: string
      }
  }
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

interface GetNft{
    nft: Nft | null;
}

interface GetStorefront {
    storefront: Storefront | null;
  }

  interface HomePageProps extends AppProps {
    storefront: Storefront;
    nft: Nft;
  }

const GET_NFT = gql`
  query GetNft($address: [String!]) {
    nft(address: $address) {
      name
      details { 
          image
          description
          creators { 
              address
          }
          properties{
              name
              value
          }
      }
    }
  }
`

export async function getServerSideProps() {
    const router = useRouter()
    const { token } = router.query

    const { data: { storefront } } = await client.query<GetStorefront>({
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
        }
      });
    
      if (isNil(storefront)) {
        return {
          notFound: true,
        }
      }

      const { data: { nft } } = await client.query<GetNft>({
        query: GET_NFT,
        variables: {
          address: token,
        }
      });
    
      if (!nft?.details.creators.includes(storefront.ownerAddress)) {
        return {
          notFound: true,
        }
      }

    return {
      props: {
        nft,
      }
    };
  }
  

interface HomePageProps extends AppProps {
    token: string
}

const Home: NextPage<HomePageProps> = ({ storefront, nft }) => {
  return (
    <div className="app-wrapper bg-black text-white">
      <div className="relative flex justify-end items-start p-6 h-60 bg-cover bg-center" style={{ backgroundImage: `url(${storefront.bannerUrl})` }}>
        <div className="flex items-center justify-end gap-6">
          <WalletMultiButton />
          <WalletDisconnectButton />
        </div>
        <Link href="/">
          <a className="absolute h-20 -bottom-10 left-6 rounded-full aspect-square bg-black bg-cover bg-center" style={{ backgroundImage: `url(${storefront.logoUrl})` }}>
          </a>
        </Link>
      </div>
      <div className="flex justify-between px-6 mt-20 mb-10">
        <div className="flex-col">
          <h1 className="text-2xl">{storefront.title}</h1>
          <p>{storefront.description}</p>
        </div>
      </div>
      <h3>{nft.name}</h3>
      <span>{JSON.stringify(nft.details)}</span>    
    </div>
  )
}

export default Home
