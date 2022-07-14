import { ApolloClient, gql, InMemoryCache } from '@apollo/client'
import { offsetLimitPagination } from '@apollo/client/utilities'
import BN from 'bn.js'
import { constructN, ifElse, isNil } from 'ramda'
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
          volumeTotal: {
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
      PricePoint: {
        fields: {
          price: {
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
      Purchase: {
        keyFields: ['id'],
        fields: {
          price: {
            read: asBN,
          },
        },
      },
      AhListing: {
        keyFields: ['id'],
        fields: {
          price: {
            read: asBN,
          },
        },
      },
      NftActivity: {
        keyFields: ['address'],
        fields: {
          price: {
            read: asBN,
          },
        },
      },
      Offer: {
        keyFields: ['id'],
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
