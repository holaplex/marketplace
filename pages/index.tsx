import { useState } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { gql, useQuery } from '@apollo/client'
import { isCompositeType } from 'graphql'

interface Nft {
  name: String
  uri: String
  creators: Array<string>
}

interface GetNftsData {
  nfts: Nft[]
}

interface NftCard {
  name: String
  collection: String
}

const creators_list = [
  '232PpcrPc6Kz7geafvbRzt5HnHP4kX88yvzUCN69WXQC',
  '58NaH44cJkYttSnAqUwe6WYMABYoEQ2JnmoYaukDBf6M'
]

const GET_NFTS = gql`
  query GetNfts($creators: [String!]) {
    nfts(creators: $creators) {
      creators
      name
      uri
    }
  }
`

const Home: NextPage = () => {
  const { data, loading } = useQuery<GetNftsData>(GET_NFTS, {
    variables: { creators: creators_list }
  })

  const [walletSelected, setWalletSelected] = useState<String>('')

  const divParentStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gridAutoRows: '300px',
    gridGap: '10px'
  }

  const divChildStyle = {
    border: '1px solid black',
    height: '275px'
  }

  const divInfoStyle = {
    width: '100%',
    display: 'inline-block'
  }

  const divImageContainer = {
    borderRadius: '10px',
    overflow: 'hidden'
  }

  return loading ? (
    <>Loading</>
  ) : (
    //  Div parent container
    <div style={{ width: '100%' }}>
      <div id='bodyContainer' style={{ display: 'inline' }}>
        <div id='mainLeft' style={{ width: '15%', float: 'left' }}>
          <h1>Some stuff here</h1>
          <button>
            <a href='#'>
              Current Listings <span>5</span>
            </a>
          </button>
          <br />
          <button>
            <a href='#'>
              Owned By Me <span>15</span>
            </a>
          </button>
          <br />
          <button>
            <a href='#'>
              Unlisted <span>9000</span>
            </a>
          </button>
          <br />
        </div>
        <div id='mainRight' style={{ width: 'auto' }}>
          {/* Search, options, buttons */}
          <div style={{ width: '100%' }}>
            <input placeholder='Search' />
            <select
              onChange={e => {
                setWalletSelected(e.target.value)
              }}
            >
              <option value=''>All Creators</option>
              {creators_list.map(c => (
                <option value={c}>{c}</option>
              ))}
            </select>
            <button>
              <span>🔲</span>
            </button>
            <button>
              <span>🔳</span>
            </button>
          </div>

          {/* This is where the body cards load */}
          <div style={divParentStyle}>
            {data?.nfts
              .filter((v, idx) => {
                if (
                  walletSelected == '' ||
                  v.creators.includes(walletSelected)
                ) {
                  console.log(v.creators)
                  return v
                }
              })
              .map(({ name, uri }) => (
                <div style={divChildStyle}>
                  <div style={divImageContainer}>
                    <Image
                      src={'http://placekitten.com/200/200'}
                      height={200}
                      width={200}
                    />
                  </div>
                  <br />
                  <div id={'info'} style={divInfoStyle}>
                    <div id={'left'} style={{ float: 'left' }}>
                      <div id={'left-top'}>{name}</div>
                      {/* <div id={'left-bottom'}>
                        <span>collection name</span>
                      </div> */}
                    </div>
                    {/* <div id={'right'}>
                      <div id={'right-top'}>
                        <span>right top</span>
                      </div>
                      <div id={'right-bottom'}>
                        <span>right bottom</span>
                      </div>
                    </div> */}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
