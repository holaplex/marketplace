import { gql, useQuery } from '@apollo/client'
import { NextPageContext, NextPage } from 'next'
import { isNil, map, prop } from 'ramda'
import { subDays } from 'date-fns'
import client from '../../client'
import { AnalyticsLayout } from './../../layouts/Analytics'
import {
  Marketplace,
  PriceChart,
  GetActivities,
  GetPriceChartData,
} from '@holaplex/marketplace-js-sdk'
import { isSol } from '../../modules/sol'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

const GET_PRICE_CHART_DATA = gql`
  query GetPriceChartData(
    $auctionHouses: [PublicKey!]!
    $startDate: DateTimeUtc!
    $endDate: DateTimeUtc!
  ) {
    charts(
      auctionHouses: $auctionHouses
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

const GET_ACTIVITIES = gql`
  query GetActivities($auctionHouses: [PublicKey!]!) {
    activities(auctionHouses: $auctionHouses) {
      address
      metadata
      auctionHouse {
        address
        treasuryMint
      }
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

export async function getServerSideProps({ req }: NextPageContext) {
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
          auctionHouses {
            authority
            address
            treasuryMint
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

  if (isNil(marketplace)) {
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

interface GetMarketplaceInfo {
  marketplace: Marketplace
}

interface GetMarketplace {
  marketplace: Marketplace | null
}

interface AnalyticsProps {
  marketplace: Marketplace
}

const startDate = subDays(new Date(), 6).toISOString()
const endDate = new Date().toISOString()

const Analytics: NextPage<AnalyticsProps> = ({ marketplace }) => {
  const solAH =
    marketplace.auctionHouses.filter((ah) => isSol(ah.treasuryMint))[0]
      .address || ''

  const priceChartQuery = useQuery<GetPriceChartData>(GET_PRICE_CHART_DATA, {
    variables: {
      auctionHouses: [solAH],
      startDate,
      endDate,
    },
  })

  const activitiesQuery = useQuery<GetActivities>(GET_ACTIVITIES, {
    variables: {
      auctionHouses: [solAH],
    },
  })

  return (
    <AnalyticsLayout
      title={<h1>{marketplace.name}</h1>}
      metaTitle={`${marketplace.name} Activity`}
      marketplace={marketplace}
      priceChartQuery={priceChartQuery}
      activitiesQuery={activitiesQuery}
    />
  )
}

export default Analytics
