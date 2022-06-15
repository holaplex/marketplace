import React, { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useRouter } from 'next/router'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { NextPageContext } from 'next'
import { map, prop, isEmpty, intersection, pipe, or, any, isNil } from 'ramda'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { gql, useQuery } from '@apollo/client'
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
} from '@holaplex/marketplace-js-sdk'
import { Wallet } from '@metaplex/js'
import { Modal } from 'src/layouts/Modal'
import Select from 'react-select'
import { TokenInfo } from '@solana/spl-token-registry'
import cx from 'classnames'
import { isSol, toSOL } from 'src/modules/sol'
import { NftPreview } from 'src/components/NftPreview'
import { useTokenList } from 'src/hooks/tokenList'
import Price from 'src/components/Price'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

type OptionType = { label: string; value: number }

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
  token: OptionsType<OptionType>
}

interface SellNftProps {
  nft: Nft
  marketplace: Marketplace
}

const ListingNew = ({ nft, marketplace }: SellNftProps) => {
  const {
    control,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SellNftForm>({})
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const router = useRouter()
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

  const [selectedToken, setSelectedToken] = useState<TokenInfo | undefined>()

  useEffect(() => {
    if (!selectedToken && tokens[0]) {
      setSelectedToken(tokens[0])
      setValue('token', {
        value: tokens[0].address,
        label: tokens[0].symbol,
      })
    }
  }, [setValue, selectedToken, tokens])

  let highestOffer: Offer | undefined
  if (nft.offers && nft.offers?.length > 0) {
    highestOffer = nft.offers.reduce((a, b) => {
      return a.price > b.price ? a : b
    })
  }

  const goBack = () => {
    router.push(`/nfts/${nft.address}`)
  }

  const acceptOffer = async () => {
    if (!publicKey || !signTransaction) {
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
            .accept({
              offer: highestOffer!,
              nft,
            })
        )
        .send()

      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      router.push(`/nfts/${nft.address}`)
    }
  }

  const sellNftTransaction = async ({ amount, token }: SellNftForm) => {
    if (!publicKey || !signTransaction) {
      return
    }

    try {
      toast('Sending the transaction to Solana.')

      //TODO: Set the auctionhouse corresponding to selected token
      await sdk
        .transaction()
        .add(
          sdk
            .listings(
              marketplace.auctionHouses.filter(
                (ah) => ah.treasuryMint === selectedToken?.address
              )[0]
            )
            .post({
              amount: isSol(token) ? +amount * LAMPORTS_PER_SOL : +amount,
              nft,
            })
        )
        .send()

      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      router.push(`/nfts/${nft.address}`)
    }
  }

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
                price={highestOffer.price.toNumber()}
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
                          'sol-input': isSol(selectedToken?.address || ''),
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
