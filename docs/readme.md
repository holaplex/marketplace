# Run your own Marketplace

## Introduction

This is how you would create your own NFT marketplace using the Holaplex API

## Data
Graph QL API Endpoint: https://graph.holaplex.com/v0

## Schema
```graphql
type Nft {
  address: String!
  name: String!
  sellerFeeBasisPoints: Int!
  mintAddress: String!
  primarySaleHappened: Boolean!
  description: String!
  image: String!
  creators: [NftCreator!]!
  attributes: [NftAttribute!]!
}
```

```graphql
type NftCreator {
  address: String!
  metadataAddress: String!
  share: Int!
  verified: Boolean!
}
```

```graphql
type NftAttribute {
  metadataAddress: String!
  value: String!
  traitType: String!
}
```


## Root Queries
	* `nft(address: PublicKey)`
	* `nfts(creators:[PublicKey,...])`

### Example Queries
Get all NFTs from a specifc PublicKey  
```graphql
{
  nfts(creators: ["232PpcrPc6Kz7geafvbRzt5HnHP4kX88yvzUCN69WXQC"]){
    name
    address
    description
    image
    creators {
      address
      share
    }
  }
}
```

### Get details about a specific NFT

```graphql
{
  nft(address: "3UF9qYsW9NNkUhAKtv42RZbWDVCiPRPW1FT3LY7RgcAP"){
    name
    description
    image
  }
}

```
	
## Actions 
Using data retrieved from Holaplex API endpoint we are able to construct transactions to perform actions we’re interested in. Metaplex Foundation Programs power Holaplex marketplaces, but ultimately the data can be used in conjunction with any on-chain Program. 

### Metaplex Foundation Auction House

```
AuctionHouse is a protocol for marketplaces to implement a decentralized sales contract. It is simple, fast and very cheap. 

AuctionHouse is a Solana program available on Mainnet Beta and Devnet. Anyone can create an AuctionHouse and accept any SPL token they wish.
```
 
*Docs:* [What is Auction House | Metaplex Docs](https://docs.metaplex.com/auction-house/definition)


**Auction House Program** - [metaplex-program-library/AuctionHouseProgram.ts at master · metaplex-foundation/metaplex-program-library · GitHub](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/AuctionHouseProgram.ts)

Metaplex offers example TypeScript API examples for their on chain Programs 

	* Buy NFT -  [metaplex-program-library/buy.ts at master · metaplex-foundation/metaplex-program-library · GitHub](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/buy.ts)
	* Sell NFT - [metaplex-program-library/sell.ts at master · metaplex-foundation/metaplex-program-library · GitHub](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/sell.ts)
	* Make Offer - 
	* Accept Offer - 
	* Cancel Offer - [metaplex-program-library/cancel.ts at master · metaplex-foundation/metaplex-program-library · GitHub](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/cancel.ts)

### How do you perform them?
Actions are sent to the solana blockchain via RPC nodes