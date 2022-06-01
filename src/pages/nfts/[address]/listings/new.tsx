import React, { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useRouter } from 'next/router'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { NextPageContext } from 'next'
import {
  map,
  prop,
  isEmpty,
  intersection,
  pipe,
  or,
  any,
  isNil,
  when,
  always,
} from 'ramda'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { gql } from '@apollo/client'
import client from './../../../../client'
import Button from './../../../../components/Button'
import { toast } from 'react-toastify'
import {
  initMarketplaceSDK,
  Nft,
  Marketplace,
} from '@holaplex/marketplace-js-sdk'
import { Wallet } from '@metaplex/js'
import { Modal } from 'src/layouts/Modal'
import { addressAvatar } from 'src/modules/address'
import Select from 'react-select'
import { ENV, TokenInfo, TokenListProvider } from '@solana/spl-token-registry'
import cx from 'classnames'
import { isSol } from 'src/modules/sol'

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
          sellerFeeBasisPoints
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

interface SellNftForm {
  amount: string
  token: string
}

interface SellNftProps {
  nft: Nft
  marketplace: Marketplace
}

const ListingNew = ({ nft, marketplace }: SellNftProps) => {
  const {
    control,
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

  const sellNftTransaction = async ({ amount, token }: SellNftForm) => {
    if (!publicKey || !signTransaction) {
      return
    }

    try {
      toast('Sending the transaction to Solana.')

      //TODO: Set the auctionhouse corresponding to selected token
      await sdk.listings(marketplace.auctionHouse).post({
        amount: isSol(token) ? +amount * LAMPORTS_PER_SOL : +amount,
        nft,
      })

      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      router.push(`/nfts/${nft.address}`)
    }
  }

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
      <Modal title={'List NFT for sale'} open={true} setOpen={goBack}>
        <div className="mt-8 flex w-full justify-start">
          <div className={`relative aspect-square h-14 w-14`}>
            {nft?.image && (
              <img
                src={nft.image}
                alt={`nft-mini-image`}
                className="block w-full h-auto border-none rounded-lg shadow"
              />
            )}
          </div>
          <div className="flex-col ml-4">
            <span>{nft.name}</span>
            <div className="flex ml-1.5">
              {nft.creators.map((creator) => (
                <div key={creator.address} className="-ml-1.5">
                  <a
                    href={`https://holaplex.com/profiles/${creator.address}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <img
                      className="rounded-full h-6 w-6 object-cover border-2 border-gray-900 transition-transform hover:scale-[1.5]"
                      src={
                        when(
                          isNil,
                          always(addressAvatar(new PublicKey(creator.address)))
                        )(creator.profile?.profileImageUrl) as string
                      }
                    />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
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
            <Button block htmlType="submit" loading={isSubmitting}>
              List for sale
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default ListingNew
