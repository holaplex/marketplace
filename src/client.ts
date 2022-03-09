import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { viewerVar } from './cache';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;

const typeDefs = gql`
  type Viewer {
    id: ID
    balance: Number
  } 

  extend type Query {
    viewer(address: String!): Viewer
  }
`;

const client = new ApolloClient({
    uri: GRAPHQL_ENDPOINT,
    typeDefs,
    cache: new InMemoryCache({

        typePolicies: {
            Query: {
                fields: {
                  viewer: {
                    read() {
                      return viewerVar();
                    }
                  }
                }
            },
            Marketplace: {
                keyFields: ['ownerAddress'],
            },
            Nft: {
                keyFields: ['address']
            },
            Wallet: {
                keyFields: ['address']
            },
            Creator: {
                keyFields: ['address']
            },
            NftCreator: {
                keyFields: ['address']
            },
            NftOwner: {
                keyFields: ['address']
            },
            ListingReceipt: {
                keyFields: ['address']
            },
            BidReceipt: {
                keyFields: ['address']
            },
            NftAttribute: {
                keyFields: ['traitType', 'value']
            }
        }
    }),
});

export default client;