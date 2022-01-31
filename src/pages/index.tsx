import { useEffect } from 'react'
import next, { NextPage } from 'next'
import { gql, useQuery } from '@apollo/client'
import {
  WalletDisconnectButton,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { isNil, modify, map, filter, pipe, prop, isEmpty, not } from 'ramda';
import { AppProps } from 'next/app';
import Link from 'next/link'
import Select, { OptionsType, ValueType } from 'react-select';
import { useForm, Controller } from "react-hook-form";
import client from '../client';
import { NftCard } from '../components/NftCard';

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN;

type OptionType = { label: string; value: number };

interface NftDetails {
  description: string;
  image: string;
}
interface Nft {
  name: string;
  address: string;
  uri: string;
  creators: string[];
  details?: NftDetails;
}

interface GetNftsData {
  nfts: Nft[];
  creator: Creator;
}

const GET_NFTS = gql`
  query GetNfts($creators: [String!]!, $attributes: [AttributeFilter!]) {
    nfts(creators: $creators, attributes: $attributes) {
      address
      name
      details {
        description
        image
      }
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

interface AttributeVariant {
  name: string;
  count: number;
}
interface AttributeGroup {
  name: string;
  variants: AttributeVariant[];
}

interface Creator {
  addresss: string;
  attributeGroups: AttributeGroup[];
}

interface GetStorefront {
  storefront: Storefront | null;
}

interface GetSidebar {
  creator: Creator;
}

interface HomePageProps extends AppProps {
  storefront: Storefront;
}

interface AttributeFilter {
  traitType: string;
  values: string[];
}
interface NFTFilterForm {
  attributes: AttributeFilter[];
}
const Home: NextPage<HomePageProps> = ({ storefront }) => {
  const nfts = useQuery<GetNftsData>(GET_NFTS, {
    variables: {
      creators: [storefront.ownerAddress],
    }
  });

  const sidebar = useQuery<GetSidebar>(GET_SIDEBAR, {
    variables: {
      address: storefront.ownerAddress,
    }
  });

  const { control, watch } = useForm<NFTFilterForm>({});

  useEffect(() => {
    const subscription = watch(({ attributes }) => {
      const next = pipe(
        filter(
          pipe(prop('values'), isEmpty, not),
        ),
        map(modify('values', map(prop('value')))),
      )(attributes);

      nfts.refetch({
        creators: [storefront.ownerAddress],
        attributes: next,
      })
    });
    return () => subscription.unsubscribe();
  }, [watch]);

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
      <div className="flex container">
        <div className="flex-none flex-col space-y-2 px-6 w-72">
          <form onSubmit={(e) => { e.preventDefault(); }}>
            <div className="flex flex-grow flex-col mb-6">
              <div className="flex rounded-md p-2  w-full justify-between">
                <h4>Current listings</h4>
                <span>0</span>
              </div>
              <div className="flex rounded-md p-2 w-full justify-between">
                <h4>Owned by me</h4>
                <span>0</span>
              </div>
              <div className="flex rounded-md p-2 w-full justify-between bg-gray-800">
                <h4>Unlisted</h4>
                <span>0</span>
              </div>
            </div>
            <div className="flex flex-grow flex-col gap-4">
              {sidebar.data?.creator.attributeGroups.map(({ name: group, variants }, index) => (
                <div className="flex flex-grow flex-col gap-2" key={group}>
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
                          className="select-base-theme"
                          classNamePrefix="base"
                          onChange={(next: ValueType<OptionType>) => {
                            onChange({ traitType: group, values: next });
                          }}
                          options={variants.map(({ name, count }) => ({ value: name, label: `${name} ${count}` })) as OptionsType<OptionType>}
                        />
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </form>
        </div>
        <div className="grow">
          {nfts.loading ? (
            <>Loading</>
          ) : (
            <ul className="grid grid-cols-4 gap-6">
              {nfts.data?.nfts.map((n) => (
                <li key={n.address}> 
                  <NftCard address={n.address} nft={n}/>
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
