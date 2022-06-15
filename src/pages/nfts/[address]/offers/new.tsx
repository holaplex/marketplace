import React, { useEffect, useMemo, useState } from 'react'
import { any, map, intersection, or, isEmpty, isNil, pipe, prop } from 'ramda'
import { NextPageContext } from 'next'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Controller, useForm } from 'react-hook-form'
import { useRouter } from 'next/router'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client'
import { toast } from 'react-toastify'
import client from './../../../../client'
import Button from './../../../../components/Button'
import { useLogin } from '../../../../hooks/login'
import { NftLayout } from './../../../../layouts/Nft'
import { Wallet } from '@metaplex/js'
import {
  initMarketplaceSDK,
  Marketplace,
  Nft,
  GetNftData,
} from '@holaplex/marketplace-js-sdk'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Modal } from 'src/layouts/Modal'
import { NftPreview } from 'src/components/NftPreview'
import { isSol } from 'src/modules/sol'
import cx from 'classnames'
import Select from 'react-select'
import { TokenInfo } from '@solana/spl-token-registry'
import { useTokenList } from './../../../../hooks/tokenList'

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

type OptionType = { label: string; value: number }

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
          auctionHouses {
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
  amount: string
  token: OptionsType<OptionType>
}

interface OfferProps {
  nft: Nft
  marketplace: Marketplace
}

const OfferNew = ({ nft, marketplace }: OfferProps) => {
  const {
    control,
    setValue,
    handleSubmit,
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
  const [tokenMap, loadingTokens] = useTokenList()

  const tokens = marketplace?.auctionHouses?.map(({ treasuryMint }) =>
    tokenMap.get(treasuryMint)
  )

  // DUMMY TOKENS FOR TESTING
  // const tokens = [
  //   tokenMap.get('So11111111111111111111111111111111111111112'),
  //   tokenMap.get('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  // ]

  const [selectedToken, setSelectedToken] = useState<TokenInfo>()

  useEffect(() => {
    if (!selectedToken && tokens[0]) {
      setSelectedToken(tokens[0])
      setValue('token', {
        value: tokens[0].address,
        label: tokens[0].symbol,
      })
    }
  }, [setValue, selectedToken, tokens])

  const goBack = () => {
    router.push(`/nfts/${nft.address}`)
  }

  const placeOfferTransaction = async ({ amount, token }: OfferForm) => {
    if (!publicKey || !signTransaction) {
      login()
      return
    }

    if (!nft) {
      return
    }

    try {
      toast('Sending the transaction to Solana.')
      await sdk
        .transaction()
        .add(
          sdk
            .offers(
              marketplace.auctionHouses.filter(
                (ah) => ah.treasuryMint === selectedToken?.address
              )[0]
            )
            .make({
              amount: isSol(token) ? +amount * LAMPORTS_PER_SOL : +amount,
              nft: nft,
            })
        )
        .send()
      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      toast.error(e.message)
      console.log(e)
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
    <>
      <Modal title={'Make an offer'} open={true} setOpen={goBack}>
        <div className="mt-8 flex w-full justify-start">
          <NftPreview nft={nft} />
        </div>
        <form
          className="text-left grow mt-6"
          onSubmit={handleSubmit(placeOfferTransaction)}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Price</label>
              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, value } }) => {
                  if (!nft) {
                    return <></>
                  }

                  return (
                    <>
                      <div
                        className={cx('mb-4', {
                          'sol-input': isSol(selectedToken?.address || ''),
                        })}
                      >
                        <input
                          autoFocus
                          value={value}
                          className="input"
                          type="number"
                          onChange={(e: any) => {
                            onChange(e.target.value)
                          }}
                        />
                      </div>
                    </>
                  )
                }}
              />
            </div>
            <div>
              <label className="block mb-1">Token</label>
              <Controller
                control={control}
                name="token"
                defaultValue={selectedToken?.address}
                render={({ field }) => {
                  return (
                    <Select
                      {...field}
                      className="select-base-theme w-full"
                      classNamePrefix="base"
                      value={{
                        value: selectedToken?.address,
                        label: selectedToken?.symbol,
                      }}
                      options={
                        tokens.map((token) => ({
                          value: token?.address,
                          label: token?.symbol,
                        })) as OptionsType<OptionType>
                      }
                      onChange={(next: ValueType<OptionType>) => {
                        setSelectedToken(tokenMap.get(next.value))
                      }}
                    />
                  )
                }}
              />
            </div>
          </div>
          <div className="mt-14">
            <Button htmlType="submit" loading={isSubmitting} block>
              Make offer
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

interface NftOfferLayoutProps {
  marketplace: Marketplace
  nft: Nft
  children: React.ReactElement
}

OfferNew.getLayout = function NftShowLayout({
  marketplace,
  nft,
  children,
}: NftOfferLayoutProps) {
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
