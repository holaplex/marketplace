# Run your own Marketplace

## Introduction

This is how you would create your own NFT marketplace using the Holaplex API

## Marketplace Data

> Graph QL API Endpoint: https://graph.holaplex.com/v0
### Nft Schema
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
  listings: [ListingReceipt!]!
  offers: [BidReceipt!]!
}
```

### NftCreator Schema
```graphql
type NftCreator {
  address: String!
  metadataAddress: String!
  share: Int!
  verified: Boolean!
}
```

### NftAttribute Schema
```graphql
type NftAttribute {
  metadataAddress: String!
  value: String!
  traitType: String!
}
```

### ListingReceipt Schema
```
type ListingReceipt {
  address: String!
  tradeState: String!
  seller: String!
  metadata: String!
  auctionHouse: String!
  price: Lamports!
  tradeStateBump: Int!
  createdAt: DateTimeUtc!
  canceledAt: DateTimeUtc
  bookkeeper: String!
  purchaseReceipt: String
  tokenSize: Int!
  bump: Int!
}
```
### BidReceipt Schema
```
type BidReceipt {
  address: String!
  tradeState: String!
  buyer: String!
  metadata: String!
  auctionHouse: String!
  price: Lamports!
  tradeStateBump: Int!
  tokenAccount: String
  createdAt: DateTimeUtc!
  canceledAt: DateTimeUtc
}
```


---
## Root Queries

- `nft(address: PublicKey){}`

- `nfts(creators:[PublicKey,...]){}`

### Example Queries

Get all NFTs from a specifc creator (PublicKey)
> Request
```graphql
{
  nfts(creators: ["232PpcrPc6Kz7geafvbRzt5HnHP4kX88yvzUCN69WXQC"]){
    name
    address
    image
    creators {
      address
      share
    }
  }
}
```
> Response
```
{
  "data": {
    "nfts": [
      {
        "name": "Whirlpools of Honey",
        "address": "3UF9qYsW9NNkUhAKtv42RZbWDVCiPRPW1FT3LY7RgcAP",
        "image": "https://bafybeidy6ardd2pvpcg5y6boidc2hfhvasb4fhx6wrn2sc675utpky5wy4.ipfs.dweb.link?ext=png",
        "creators": [
          {
            "address": "232PpcrPc6Kz7geafvbRzt5HnHP4kX88yvzUCN69WXQC",
            "share": 100
          }
        ]
      },
      {...},
      {...},
    ]
  }
}
```


### Get details about a specific NFT
> Request
```graphql
{
  nft(address: "3UF9qYsW9NNkUhAKtv42RZbWDVCiPRPW1FT3LY7RgcAP"){
    address
    name
  }
}
```
> Response
```
{
  "data": {
    "nft": {
      "address": "3UF9qYsW9NNkUhAKtv42RZbWDVCiPRPW1FT3LY7RgcAP",
      "name": "Whirlpools of Honey"
    }
  }
}
```

As you can see with our two root queries you have the ability to quickly and effiecently find the data you're looking for. 

---
## Marketplace Actions 
Using data retrieved from Holaplex API endpoint we are able to construct transactions to perform actions we’re interested in. Metaplex Foundation Programs power Holaplex marketplaces, but ultimately the data can be used in conjunction with any on-chain Program; open source or bespoke. 

### Metaplex Foundation Auction House

```
AuctionHouse is a protocol for marketplaces to implement a decentralized sales contract. It is simple, fast and very cheap. 

AuctionHouse is a Solana program available on Mainnet Beta and Devnet. Anyone can create an AuctionHouse and accept any SPL token they wish.
```
 
> Source:  [What is Auction House | Metaplex Docs](https://docs.metaplex.com/auction-house/definition)

Metaplex also offers example TypeScript examples on constructing transaction instructions for the Auction House

> **Auction House Program TypeScript Definition** - [metaplex-program-library/AuctionHouseProgram.ts](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/AuctionHouseProgram.ts)

### Marketplace Actions

The Auction House Program enables us to perform the following types of actions 

* Sell NFT - Sell a NFT you own - [instructions/sell.ts](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/sell.ts)

* Buy NFT -  Purchase a NFT currently listed for sale -  [instructions/buy.ts](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/buy.ts)


* Make Offer - Make an offer on a NFT, listed for sale or not -  [instructions/buy.ts](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/buy.ts) & [instructions/printBidReceipt.ts](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/printBidReceipt.ts)

* Accept Offer - Accept a buy offer on a NFT you own - [createSellInstruction](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/sell.ts) & [createPrintListingReceiptInstruction](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/printListingReceipt.ts) &  [executePrintPurchaseReceiptInstruction](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/printPurchaseReceipt.ts)

* Cancel Listing - [instructions/cancel.ts](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/cancel.ts) & cancelListingReceiptInstruction

* Cancel Offer - [instructions/cancel.ts](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/auction-house/js/src/generated/instructions/cancel.ts)

### How do you perform them?
Solana provides a javascript web3 library for data queries and sending transactions. [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/) In conjunction with the solana library we’ll use the Auction House package.

Sell NFT example
```TypeScript
# Create Sell Instruction
const sellInstruction = createSellInstruction(sellInstructionAccounts,sellInstructionArgs)

# Create Receipt Instruction
const printListingReceiptInstruction = createPrintListingReceiptInstruction(listingReceiptInstructionAccounts, listingReceiptInstructionArgs)

# Create Transaction Object
const tx = new Transaction()

# Add instructions to Transaction
tx.add(sellInstruction).add(printListingReceiptInstruction)

# Get recent blockhash
tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash

# Set transaction fee payer
tx.feePayer = publicKey

# Sign tranaction
signed = await signTransaction(tx);

# Send tranaction and get its ID
signature = await connection.sendRawTransaction(signed.serialize());

# Wait for tranaction to be confirmed
await connection.confirmTransaction(signature, 'confirmed');
```