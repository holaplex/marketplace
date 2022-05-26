import { gql, useQuery } from '@apollo/client'
import { NextPageContext, NextPage } from 'next'
import { isNil, or, any, equals, not, map, prop } from 'ramda'
import { subDays } from 'date-fns'
import client from '../../../client'
import { AnalyticsLayout } from './../../../layouts/Analytics'
import { truncateAddress } from './../../../modules/address'
import { useRouter } from 'next/router'
import {
  Marketplace,
  PriceChart,
  GetActivities,
  GetPriceChartData,
} from '@holaplex/marketplace-js-sdk'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

const pluckCreatorAddresses = map(prop('creatorAddress'))

const GET_ACTIVITIES = gql`
  query GetActivities($auctionHouses: [PublicKey!]!, $creators: [PublicKey!]) {
    activities(auctionHouses: $auctionHouses, creators: $creators) {
      address
      metadata
      auctionHouse
      price
      createdAt
      wallets {
        address
        profile {
          handle
          profileImageUrl
        }
      }
      activityType
      nft {
        name
        image
        address
      }
    }
  }
`

const GET_PRICE_CHART_DATA = gql`
  query GetPriceChartData(
    $auctionHouses: [PublicKey!]!
    $creators: [PublicKey!]
    $startDate: DateTimeUtc!
    $endDate: DateTimeUtc!
  ) {
    charts(
      auctionHouses: $auctionHouses
      creators: $creators
      startDate: $startDate
      endDate: $endDate
    ) {
      listingFloor {
        price
        date
      }
      salesAverage {
        price
        date
      }
      totalVolume {
        price
        date
      }
    }
  }
`

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'] || SUBDOMAIN

  const response = await client.query<GetMarketplace>({
    fetchPolicy: 'no-cache',
    query: gql`
      query GetMarketplacePage($subdomain: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          description
          logoUrl
          bannerUrl
          creators {
            creatorAddress
            storeConfigAddress
          }
          auctionHouse {
            authority
            address
          }
        }
      }
    `,
    variables: {
      subdomain,
    },
  })

  const {
    data: { marketplace },
  } = response
  const marketplaceCreatorAddresses = pluckCreatorAddresses(
    marketplace?.creators || []
  )

  const isMarketplaceCreator = any(equals(query.creator))(
    marketplaceCreatorAddresses
  )

  if (or(isNil(marketplace), not(isMarketplaceCreator))) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      marketplace,
    },
  }
}

interface GetMarketplace {
  marketplace: Marketplace | null
}

interface CreatorAnalyticsProps {
  marketplace: Marketplace
}

const startDate = subDays(new Date(), 6).toISOString()
const endDate = new Date().toISOString()

const CreatorAnalytics: NextPage<CreatorAnalyticsProps> = ({ marketplace }) => {
  const router = useRouter()
  const priceChartQuery = useQuery<GetPriceChartData>(GET_PRICE_CHART_DATA, {
    fetchPolicy: 'network-only',
    variables: {
      auctionHouses: [marketplace.auctionHouse.address],
      creators: [router.query.creator],
      startDate,
      endDate,
    },
  })

  const activitiesQuery = useQuery<GetActivities>(GET_ACTIVITIES, {
    variables: {
      auctionHouses: [marketplace.auctionHouse.address],
      creators: [router.query.creator],
    },
  })

  const truncatedAddress = truncateAddress(router.query?.creator as string)

  return (
    <AnalyticsLayout
      title={<h1 className="mb-4 text-3xl pubkey">{truncatedAddress}</h1>}
      metaTitle={`${truncatedAddress} Activity`}
      marketplace={marketplace}
      priceChartQuery={priceChartQuery}
      activitiesQuery={activitiesQuery}
    />
  )
}

export default CreatorAnalytics
