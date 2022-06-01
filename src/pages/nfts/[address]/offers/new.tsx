import React, { useEffect, ReactElement, useMemo, useState } from 'react'
import { any, map, intersection, or, isEmpty, isNil, pipe, prop } from 'ramda'
import { NextPageContext } from 'next'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Controller, useForm } from 'react-hook-form'
import { useRouter } from 'next/router'
import { gql } from '@apollo/client'
import { toast } from 'react-toastify'
import client from './../../../../client'
import Button from './../../../../components/Button'
import { useLogin } from '../../../../hooks/login'
import { Wallet } from '@metaplex/js'
import {
  initMarketplaceSDK,
  Marketplace,
  Nft,
} from '@holaplex/marketplace-js-sdk'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Modal } from 'src/layouts/Modal'
import { NftPreview } from 'src/components/NftPreview'
import { isSol } from 'src/modules/sol'
import cx from 'classnames'
import Select from 'react-select'
import { ENV, TokenInfo, TokenListProvider } from '@solana/spl-token-registry'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

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
  amount: string
  token: string
}

interface OfferProps {
  nft: Nft
  marketplace: Marketplace
}

const OfferNew = ({ nft, marketplace }: OfferProps) => {
  const {
    control,
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

  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map())

  // TODO: Once auctionHouses has data, we can uncommment this and remove dummy tokens array
  // const tokens: TokenInfo[] = marketplaceData?.auctionHouses?.map(
  //   ({ treasuryMint }) => tokenMap.get(treasuryMint)
  // )
  const tokens = [
    tokenMap.get('So11111111111111111111111111111111111111112'),
    tokenMap.get('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  ]
  const [selectedToken, setSelectedToken] = useState<TokenInfo | undefined>(
    tokens[0]
  )

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
      //TODO: Set the auctionhouse corresponding to selected token
      await sdk.offers(marketplace.auctionHouse).make({
        amount: isSol(token) ? +amount * LAMPORTS_PER_SOL : +amount,
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

  useEffect(() => {
    new TokenListProvider().resolve().then((tokens) => {
      const tokenList = tokens.filterByChainId(ENV.MainnetBeta).getList()

      setTokenMap(
        tokenList.reduce((map, item) => {
          map.set(item.address, item)
          return map
        }, new Map())
      )
    })
  }, [setTokenMap])

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
                          'sol-input': isSol(selectedToken?.address),
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
                      options={
                        tokens.map((token) => ({
                          value: token?.address,
                          label: token?.name,
                        })) as OptionsType<OptionType>
                      }
                      className="select-base-theme w-full"
                      classNamePrefix="base"
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

export default OfferNew
