import { useState } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { gql, useQuery } from '@apollo/client'
import {
  WalletDisconnectButton,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { isNil } from 'ramda';
import { AppProps } from 'next/app';
import Link from 'next/link'
import client from '../client';

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN;

interface Nft {
  name: string;
  uri: string;
  creators: string[];
}

interface GetNftsData {
  nfts: Nft[];
}

const GET_NFTS = gql`
  query GetNfts($creators: [String!]) {
    nfts(creators: $creators) {
      name
      uri
    }
  }
`

export async function getServerSideProps() {
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

  return {
    props: {
      storefront,
    }
  };
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

interface GetStorefront {
  storefront: Storefront | null;
}

interface HomePageProps extends AppProps {
  storefront: Storefront;
}

const Home: NextPage<HomePageProps> = ({ storefront }) => {
  const { data, loading } = useQuery<GetNftsData>(GET_NFTS, {
    variables: {
      creators: [storefront.ownerAddress],
    }
  });

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
      {loading ? (
        <>Loading</>
      ) : (
        <ul>
          {data?.nfts.map(({ name, uri }) => (
            <li key={name}>
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Home
