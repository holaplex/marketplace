import React, { useContext, useEffect, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { useRouter } from 'next/router'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { NextPageContext } from 'next'
import {
  map,
  isEmpty,
  intersection,
  pipe,
  or,
  any,
  isNil,
  find,
  prop,
  equals,
} from 'ramda'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { gql, useQuery, QueryResult, OperationVariables } from '@apollo/client'
import client from './../../../../client'
import Button from './../../../../components/Button'
import { NftLayout } from './../../../../layouts/Nft'
import { toast } from 'react-toastify'
import {
  initMarketplaceSDK,
  Nft,
  Marketplace,
  Offer,
  GetNftData,
  AuctionHouse,
} from '@holaplex/marketplace-js-sdk'
import { Wallet } from '@metaplex/js'
import { Modal } from './../../../../layouts/Modal'
import Select from 'react-select'
import cx from 'classnames'
import { isSol } from './../../../../modules/sol'
import { NftPreview } from './../../../../components/NftPreview'
import { useTokenList } from './../../../../hooks/tokenList'
import Price from './../../../../components/Price'
import { getPriceWithMantissa } from '../../../../modules/token'
import {
  Action,
  MultiTransactionContext,
} from '../../../../modules/multi-transaction'
import BN from 'bn.js'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

type OptionType = { label: string; value: number }

interface GetNftPage {
  marketplace: Marketplace | null
  nft: Nft | null
  nftQuery: QueryResult<GetNftData, OperationVariables>
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
        id
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
        id
        auctionHouse {
          address
          treasuryMint
        }
        seller
        metadata
        price
        tokenSize
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
          sellerFeeBasisPoints
          mintAddress
          owner {
            associatedTokenAccountAddress
          }
          creators {
            address
          }
          offers {
            id
            tradeState
            price
            buyer
            createdAt
            auctionHouse {
              address
              treasuryMint
            }
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

interface SellNftForm {
  amount: string
  token: ValueType<OptionType>
}

interface SellNftProps {
  nft: Nft
  marketplace: Marketplace
}

const ListingNew = ({ nft, marketplace, nftQuery }: SellNftProps) => {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const router = useRouter()
  const sdk = useMemo(
    () => initMarketplaceSDK(connection, wallet as Wallet),
    [connection, wallet]
  )
  const { runActions } = useContext(MultiTransactionContext)

  const [tokenMap, _loadingTokens] = useTokenList()
  const tokens = marketplace?.auctionHouses?.map(({ treasuryMint }) =>
    tokenMap.get(treasuryMint)
  )
  const defaultToken = tokens?.filter((token) => isSol(token?.address || ''))[0]

  const {
    control,
    setValue,
    handleSubmit,
    getValues,
    reset,
    formState: { isSubmitting },
  } = useForm<SellNftForm>({})
  useWatch({ name: 'token', control })
  const selectedToken = getValues().token
  const auctionHouse = find(
    pipe(prop('treasuryMint'), equals(selectedToken?.value))
  )(marketplace.auctionHouses || []) as AuctionHouse

  let highestOffer: Offer | undefined
  if (nft.offers && nft.offers?.length > 0) {
    highestOffer = nft.offers.reduce((a, b) => {
      if (b.auctionHouse.address != auctionHouse.address) {
        return a
      }

      return a.price > b.price ? a : b
    })
  }

  const goBack = () => {
    router.push(`/nfts/${nft.address}`)
  }

  const onAcceptOffer = async () => {
    if (highestOffer) {
      toast('Sending the transaction to Solana.')
      await sdk
        .transaction()
        .add(
          sdk.offers(auctionHouse).accept({
            offer: highestOffer!,
            nft,
          })
        )
        .send()
    }
  }

  const acceptOffer = async () => {
    if (!publicKey || !signTransaction) {
      return
    }

    const newActions: Action[] = [
      {
        name: 'Accepting offer...',
        id: 'acceptOffer',
        action: onAcceptOffer,
        param: undefined,
      },
    ]

    await runActions(newActions, {
      onActionSuccess: async () => {
        toast.success('The transaction was confirmed.')
      },
      onComplete: async () => {
        await nftQuery.refetch()
        router.push(`/nfts/${nft.address}`)
      },
      onActionFailure: async (err) => {
        toast.error(err.message)
      },
    })
  }

  const sellNftTransaction = async ({ amount, token }: SellNftForm) => {
    if (!publicKey || !signTransaction) {
      return
    }

    try {
      toast('Sending the transaction to Solana.')
      await sdk
        .transaction()
        .add(
          sdk.listings(auctionHouse).post({
            amount: getPriceWithMantissa(+amount, tokenMap.get(token.value)!),
            nft,
          })
        )
        .send()

      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      console.log('sell nft txn error', e)
      toast.error(e.message)
    } finally {
      await nftQuery.refetch()
      router.push(`/nfts/${nft.address}`)
    }
  }

  useEffect(() => {
    if (!selectedToken && tokens && tokens[0]) {
      setValue('token', {
        value: tokens[0].address,
        label: tokens[0].symbol,
      })
    }
  }, [setValue, selectedToken, tokens])

  useEffect(() => {
    reset({
      token: { value: defaultToken?.address, label: defaultToken?.symbol },
    })
  }, [defaultToken, reset])

  return (
    <>
      <Modal title={'List NFT for sale'} open={true} setOpen={goBack}>
        <div className="mt-8 flex w-full justify-start">
          <NftPreview nft={nft} />
        </div>
        {highestOffer && (
          <div className="flex justify-between mt-8">
            <div className="flex-col gap-2">
              <div className="text-gray-300">Highest offer</div>
              <Price
                price={new BN(highestOffer.price).toNumber()}
                token={tokenMap.get(highestOffer.auctionHouse.treasuryMint)}
              />
            </div>
            <div>
              <Button onClick={acceptOffer}>Accept Offer</Button>
            </div>
          </div>
        )}
        <form
          className="text-left grow mt-6"
          onSubmit={handleSubmit(sellNftTransaction)}
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
                          'sol-input': isSol(selectedToken?.value || ''),
                        })}
                      >
                        <input
                          autoFocus
                          value={value}
                          className="input"
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
                render={({ field }) => {
                  return (
                    <Select
                      className="select-base-theme w-full"
                      classNamePrefix="base"
                      value={field.value}
                      options={
                        tokens.map((token) => ({
                          value: token?.address,
                          label: token?.symbol,
                        })) as OptionsType<OptionType>
                      }
                      onChange={(next: ValueType<OptionType>) => {
                        field.onChange(next)
                      }}
                    />
                  )
                }}
              />
            </div>
          </div>
          <div className="mt-14">
            <Button block htmlType="submit" loading={isSubmitting}>
              List for sale
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

interface ListingNewLayoutProps {
  marketplace: Marketplace
  nft: Nft
  children: React.ReactElement
}

ListingNew.getLayout = function ListingNewLayout({
  marketplace,
  nft,
  children,
}: ListingNewLayoutProps) {
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

export default ListingNew
