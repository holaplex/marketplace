import React, { useEffect, ReactElement, useMemo } from 'react'
import { any, map, intersection, or, isEmpty, isNil, pipe, prop } from 'ramda'
import { NextPageContext } from 'next'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { gql, useQuery } from '@apollo/client'
import { toast } from 'react-toastify'
import { NftLayout } from './../../../../layouts/Nft'
import client from './../../../../client'
import { GetNftData, Marketplace } from './../../../../types'
import Button, { ButtonType } from './../../../../components/Button'
import { useLogin } from '../../../../hooks/login'
import { Wallet } from '@metaplex/js'
import { initMarketplaceSDK, Nft } from '@holaplex/marketplace-js-sdk'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

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
        auctionHouse
      }
      activities {
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
      }
      listings {
        address
        auctionHouse
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

interface GetNftPage {
  marketplace: Marketplace | null
  nft: Nft | null
}

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

interface OfferForm {
  amount: number
}

interface OfferProps {
  nft?: Nft
  marketplace: Marketplace
}

const OfferNew = ({ nft, marketplace }: OfferProps) => {
  const {
    handleSubmit,
    register,
    formState: { isSubmitting },
  } = useForm<OfferForm>({})
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const router = useRouter()
  const login = useLogin()
  const sdk = useMemo(
    () => initMarketplaceSDK(connection, wallet as Wallet),
    [connection, wallet]
  )

  const placeOfferTransaction = async ({ amount }: OfferForm) => {
    if (!publicKey || !signTransaction) {
      login()
      return
    }

    if (!nft) {
      return
    }

    try {
      toast('Sending the transaction to Solana.')
      await sdk.offers(marketplace.auctionHouse).make({
        amount: amount * LAMPORTS_PER_SOL,
        nft: nft,
      })
      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      router.push(`/nfts/${nft.address}`)
    }
  }

  useEffect(() => {
    if (!nft || !publicKey) {
      return
    }

    if (nft.owner.address === publicKey.toBase58()) {
      router.push(`/nfts/${nft.address}`)
      return
    }
  }, [publicKey, nft, router])

  return (
    <form
      className="text-left grow mt-6"
      onSubmit={handleSubmit(placeOfferTransaction)}
    >
      <h3 className="mb-6 text-xl font-bold md:text-2xl">Make an offer</h3>
      <div className="mb-4 sol-input">
        <input
          {...register('amount', { required: true })}
          autoFocus
          className="input"
          type="number"
          placeholder="Price in SOL"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link href={`/nfts/${nft?.address}`} passHref>
          <Button type={ButtonType.Secondary} block>
            Cancel
          </Button>
        </Link>
        <Button htmlType="submit" loading={isSubmitting} block>
          Place offer
        </Button>
      </div>
    </form>
  )
}

interface NftShowLayoutProps {
  marketplace: Marketplace
  nft: Nft
  children: ReactElement
}

OfferNew.getLayout = function NftShowLayout({
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

export default OfferNew
