import { useState } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { gql, useQuery } from '@apollo/client'
import { isCompositeType } from 'graphql'
import {NFTCard} from '../components/NFTCard'
interface Nft {
  name: String
  uri: String
  creators: Array<String>
}

interface GetNftsData {
  nfts: Nft[]
}

interface NftCard {
  name: String
  collection: String
  creators: Array<String>
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

  const buttonStyle = {
    padding: '0.5em',
    color: 'white',
    backgroundColor: 'purple',
    width: '100%',
    marginTop: '1em'
  }

  const selectStyle = {
    marginTop: '1em',
    border: '1px solid black'
  }

  const creatorStyle = { 

  }

  return loading ? (
    <>Loading</>
  ) : (
    //  Div parent container
    <div style={{ width: '100%' }}>
      <div id='bodyContainer' style={{ display: 'inline' }}>
        <div id='mainLeft' style={{marginLeft: '1%', width: '15%', float: 'left' }}>
          <h1>Some stuff here</h1>
          
          <div id="buttonContainer" style={{width: '95%', display: "inline-block"}}>
          <button style={buttonStyle}>
            <a href='#'>
              Current Listings <span>5</span>
            </a>
          </button>
          
          <button style={buttonStyle}>
            <a href='#'>
              Owned By Me <span>15</span>
            </a>
          </button>
          
          <button style={buttonStyle}>
            <a href='#'>
              Unlisted <span>9000</span>
            </a>
          </button>
          </div>
          <div id="creatorsFilterContainer">
          {/* <select
              onChange={e => {
                setWalletSelected(e.target.value)
              }}
              style={selectStyle}
            >
              <option value=''>All Creators</option>
              {creators_list.map(c => (
                <option value={c}>{c.substring(0,4) + "...." + c.slice(-4)}</option>
              ))}
            </select> */}
            <div style={{marginTop: '5px'}}>
              <h3>Creators</h3>
            <div id={"div_"} style={{marginBottom: '5px', border: '1px solid black'}}
              onClick={e => {
                setWalletSelected(e.currentTarget.id.split('_')[1])
              }}
              >
                <button>
                <img
                src="https://st4.depositphotos.com/1000507/24488/v/600/depositphotos_244889634-stock-illustration-user-profile-picture-isolate-background.jpg"
                width={50}
                height={50}
                style={{display: 'inline-block', marginRight: '2px'}}
                />
                  <span>All Creators</span>
                </button>
              </div>
            {creators_list.map((c)=>(
              <div id={"div_" + c} style={{marginBottom: '5px', border: '1px solid black'}}
              onClick={e => {
                setWalletSelected(e.currentTarget.id.split('_')[1])
              }}
              >
                <button>
                <img
                src="https://st4.depositphotos.com/1000507/24488/v/600/depositphotos_244889634-stock-illustration-user-profile-picture-isolate-background.jpg"
                width={50}
                height={50}
                style={{display: 'inline-block', marginRight: '2px'}}
                />
                  <span>{c.substring(0,4) + "...." + c.slice(-4)}</span>
                </button>
              </div>
              ))}
              </div>
          </div>
        </div>
        <div id='mainRight' style={{ width: 'auto' }}>
          {/* Search, options, buttons */}
          <div style={{ width: '100%' }}>
            <input placeholder='Search' />
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
                  v.creators.includes(String(walletSelected))
                ) {
                  console.log(v.creators)
                  return v
                }
              })
              .map(({ name, creators, uri }) => (
                <NFTCard
                  name={name}
                  creators={creators}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home