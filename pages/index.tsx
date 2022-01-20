import { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { gql, useQuery } from '@apollo/client'
import { isCompositeType } from 'graphql'

interface Nft {
  name: string
  uri: string
}

interface GetNftsData {
  nfts: Nft[]
}

interface NftCard {
  name: string
  collection: string
}

const GET_NFTS = gql`
  query GetNfts {
    nfts(creators: ["232PpcrPc6Kz7geafvbRzt5HnHP4kX88yvzUCN69WXQC"]) {
      name
      uri
    }
  }
`

const Home: NextPage = () => {
  const { data, loading } = useQuery<GetNftsData>(GET_NFTS)

  const divParentStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gridAutoRows: "300px",
    gridGap: "10px"
  }

  const divChildStyle = {
    border: "1px solid black",
    height: "275px",

  }

  const divInfoStyle = {
    width: "100%",
    display: "inline-block"
  }

  const divImageContainer = {
    borderRadius: '10px', 
    overflow: 'hidden'
  }

  return loading ? (
    <>Loading</>
  ) : (
    //  Div parent container
    <div style={{width: "100%"}}>
    <div id="bodyContainer" style={{ display: "inline"}}>
      <div id="mainLeft" style={{width: "15%", float: "left"}}>
        <h1>Some stuff here</h1>
        <button><a href="#">Current Listings <span>5</span></a></button><br/>
        <button><a href="#">Owned By Me <span>15</span></a></button><br/>
        <button><a href="#">Unlisted <span>9000</span></a></button><br/>
      </div>
      <div id="mainRight" style={{width:"auto"}}>
      {/* Search, options, buttons */}
      <div style={{width: "100%"}}>
        <input placeholder='Search'/>
        <select>
          <option>Recently Added</option>
          <option>Another Option</option>
        </select>
        <button><span>🔲</span></button>
          <button><span>🔳</span></button>
      </div>

      {/* This is where the body cards load */}
      <div style={divParentStyle}>
        {data?.nfts.map(({ name, uri }) => (
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
              <div id={'left'}>
                <div id={'left-top'}>
                  {name}
                </div>
                <div id={'left-bottom'} >
                <span>collection name</span>
                </div>
              </div>
              <div id={'right-top'}>
                <span>right top</span>
              </div>
              <div id={'right-bottom'}>
                <span>right bottom</span>
              </div>
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
