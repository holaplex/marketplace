import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { gql, useQuery } from '@apollo/client'
import { Header } from '../components/Header'

interface Nft {
  name: string
  uri: string
}

interface GetNftsData {
  nfts: Nft[]
}

const GET_NFTS = gql`
  query GetNfts {
    nfts {
      name
      uri
    }
  }
`
const Home: NextPage = () => {
  const { data, loading } = useQuery<GetNftsData>(GET_NFTS)

  return loading ? (
    <>Loading</>
  ) : (
    <>
      <Header title="AwesomeDAO" />
      <ul>
        {data?.nfts.map(({ name, uri }) => (
          <li key={name}>
            {name} - {uri}
          </li>
        ))}
      </ul>
    </>
  )
}

export default Home
