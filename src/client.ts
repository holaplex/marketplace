import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { offsetLimitPagination } from '@apollo/client/utilities'
import { ifElse, constructN, isNil } from 'ramda'
import BN from 'bn.js'
import { viewerVar } from './cache'

const asBN = ifElse(isNil, () => new BN(0), constructN(1, BN))

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT

const typeDefs = gql`
  type Viewer {
    id: ID
    balance: Number
  }

  extend type Query {
    viewer(address: String!): Viewer
  }
`

const client = new ApolloClient({
  uri: GRAPHQL_ENDPOINT,
  typeDefs,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          nfts: offsetLimitPagination(),
          viewer: {
            read() {
              return viewerVar()
            },
          },
        },
      },
      MintStats: {
        fields: {
          volume24hr: {
            read: asBN,
          },
          average: {
            read: asBN,
          },
          floor: {
            read: asBN,
          },
        },
      },
      StoreCreator: {
        keyFields: ['creatorAddress', 'storeConfigAddress'],
      },
      Marketplace: {
        keyFields: ['ownerAddress'],
      },
      Nft: {
        keyFields: ['address'],
      },
      Wallet: {
        keyFields: ['address'],
      },
      Creator: {
        keyFields: ['address'],
      },
      NftCreator: {
        keyFields: ['address'],
      },
      NftOwner: {
        keyFields: ['address'],
      },
      PurchaseReceipt: {
        keyFields: ['address'],
        fields: {
          price: {
            read: asBN,
          },
        },
      },
      ListingReceipt: {
        keyFields: ['address'],
        fields: {
          price: {
            read: asBN,
          },
        },
      },
      BidReceipt: {
        keyFields: ['address'],
        fields: {
          price: {
            read: asBN,
          },
        },
      },
      NftAttribute: {
        keyFields: ['traitType', 'value'],
      },
    },
  }),
})

export default client
