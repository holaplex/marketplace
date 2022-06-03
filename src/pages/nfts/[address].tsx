import { gql, useQuery, QueryResult, OperationVariables } from '@apollo/client'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/router'
import { NextPage, NextPageContext } from 'next'
import { AppProps } from 'next/app'
import { any, intersection, isEmpty, isNil, map, or, pipe, prop } from 'ramda'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { NftLayout } from './../../layouts/Nft'
import client from '../../client'
import Button, { ButtonType } from '../../components/Button'
import { useLogin } from '../../hooks/login'
import { Marketplace, Offer } from '@holaplex/marketplace-js-sdk'
import { ReactElement, useMemo } from 'react'
import { Wallet } from '@metaplex/js'
import {
  Nft,
  Listing,
  initMarketplaceSDK,
  GetNftData,
} from '@holaplex/marketplace-js-sdk'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

interface GetNftPage {
  marketplace: Marketplace | null
  nft: Nft | null
}

const GET_NFT = gql`
  query GetNft($address: String!) {
    nft(address: $address) {
      name
      address
      image(width: 1400)
      sellerFeeBasisPoints
      mintAddress
      description
      primarySaleHappened
      category
      files {
        fileType
        uri
      }
      owner {
        address
        associatedTokenAccountAddress
        twitterHandle
        profile {
          handle
          profileImageUrl
        }
      }
      attributes {
        traitType
        value
      }
      creators {
        address
        twitterHandle
        profile {
          handle
          profileImageUrl
        }
      }
      offers {
        address
        tradeState
        price
        buyer
        createdAt
        auctionHouse {
          address
          treasuryMint
        }
      }
      activities {
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
      }
      listings {
        address
        auctionHouse {
          address
          treasuryMint
        }
        bookkeeper
        seller
        metadata
        purchaseReceipt
        price
        tokenSize
        bump
        tradeState
        tradeStateBump
        createdAt
        canceledAt
      }
    }
  }
`

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain']

  const {
    data: { marketplace, nft },
  } = await client.query<GetNftPage>({
    fetchPolicy: 'no-cache',
    query: gql`
      query GetNftPage($subdomain: String!, $address: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          description
          logoUrl
          bannerUrl
          ownerAddress
          creators {
            creatorAddress
            storeConfigAddress
          }
          auctionHouse {
            address
            treasuryMint
            auctionHouseTreasury
            treasuryWithdrawalDestination
            feeWithdrawalDestination
            authority
            creator
            auctionHouseFeeAccount
            bump
            treasuryBump
            feePayerBump
            sellerFeeBasisPoints
            requiresSignOff
            canChangeSalePrice
          }
        }
        nft(address: $address) {
          address
          image
          name
          description
          mintAddress
          owner {
            associatedTokenAccountAddress
          }
          creators {
            address
          }
        }
      }
    `,
    variables: {
      subdomain: subdomain || SUBDOMAIN,
      address: query?.address,
    },
  })

  const nftCreatorAddresses = map(prop('address'))(nft?.creators || [])
  const marketplaceCreatorAddresses = map(prop('creatorAddress'))(
    marketplace?.creators || []
  )
  const notAllowed = pipe(
    intersection(marketplaceCreatorAddresses),
    isEmpty
  )(nftCreatorAddresses)

  if (or(any(isNil)([marketplace, nft]), notAllowed)) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      marketplace,
      nft,
    },
  }
}

interface NftPageProps extends AppProps {
  isOwner: boolean
  offer: Offer
  listing: Listing
  nft: Nft
  marketplace: Marketplace
  nftQuery: QueryResult<GetNftData, OperationVariables>
}

const NftShow: NextPage<NftPageProps> = ({
  nft,
  isOwner,
  offer,
  listing,
  marketplace,
  nftQuery,
}) => {
  console.log(nft, isOwner, offer, listing, marketplace)
  const cancelListingForm = useForm()
  const buyNowForm = useForm()
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const login = useLogin()
  const sdk = useMemo(
    () => initMarketplaceSDK(connection, wallet as Wallet),
    [connection, wallet]
  )

  const buyNftTransaction = async () => {
    if (!publicKey || !signTransaction) {
      login()
      return
    }

    if (!listing || isOwner) {
      return
    }

    try {
      toast('Sending the transaction to Solana.')

      await sdk.listings(marketplace.auctionHouse).buy({
        listing,
        nft,
      })

      toast.success('The transaction was confirmed.')

      nftQuery.refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const cancelListingTransaction = async () => {
    if (!publicKey || !signTransaction) {
      login()
      return
    }

    if (!listing || !isOwner) {
      return
    }

    try {
      toast('Sending the transaction to Solana.')

      await sdk.listings(marketplace.auctionHouse).cancel({
        listing,
        nft,
      })

      toast.success('The transaction was confirmed.')

      nftQuery.refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <>
      {!isOwner && !offer && (
        <Link href={`/nfts/${nft.address}/offers/new`} passHref>
          <a className="flex-1">
            <Button type={ButtonType.Secondary} block>
              Make Offer
            </Button>
          </a>
        </Link>
      )}
      {isOwner && !listing && (
        <Link href={`/nfts/${nft.address}/listings/new`} passHref>
          <a className="flex-1">
            <Button block>Sell NFT</Button>
          </a>
        </Link>
      )}
      {listing && !isOwner && (
        <form
          className="flex-1"
          onSubmit={buyNowForm.handleSubmit(buyNftTransaction)}
        >
          <a>
            <Button
              loading={buyNowForm.formState.isSubmitting}
              htmlType="submit"
              block
            >
              Buy Now
            </Button>
          </a>
        </form>
      )}
      {listing && isOwner && (
        <form
          className="flex-1"
          onSubmit={cancelListingForm.handleSubmit(cancelListingTransaction)}
        >
          <Button
            block
            loading={cancelListingForm.formState.isSubmitting}
            htmlType="submit"
            type={ButtonType.Secondary}
          >
            Cancel Listing
          </Button>
        </form>
      )}
    </>
  )
}

interface NftShowLayoutProps {
  marketplace: Marketplace
  nft: Nft
  children: ReactElement
}

NftShow.getLayout = function NftShowLayout({
  marketplace,
  nft,
  children,
}: NftShowLayoutProps) {
  const router = useRouter()

  const nftQuery = useQuery<GetNftData>(GET_NFT, {
    client,
    variables: {
      address: router.query?.address,
    },
  })

  return (
    <NftLayout marketplace={marketplace} nft={nft} nftQuery={nftQuery}>
      {children}
    </NftLayout>
  )
}

export default NftShow
