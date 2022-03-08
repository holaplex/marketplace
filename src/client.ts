import { ApolloClient, InMemoryCache } from "@apollo/client";
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT;

const client = new ApolloClient({
    uri: GRAPHQL_ENDPOINT,
    cache: new InMemoryCache({
        typePolicies: {
            Marketplace: {
                keyFields: ['subdomain'],
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