import React, { ReactElement } from 'react'
import { useForm, Controller } from 'react-hook-form'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { MetadataProgram } from '@metaplex-foundation/mpl-token-metadata'
import { NextPageContext } from 'next'
import { map, prop, isEmpty, intersection, pipe, or, any, isNil } from 'ramda'
import {
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js'
import { gql, useQuery } from '@apollo/client'
import client from './../../../../client'
import { NftLayout } from './../../../../layouts/Nft'
import Button, { ButtonType } from './../../../../components/Button'
import { Nft, Marketplace, GetNftData } from './../../../../types'
import { toast } from 'react-toastify'

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

const { createSellInstruction, createPrintListingReceiptInstruction } =
  AuctionHouseProgram.instructions

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
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()

  const sellNftTransaction = async ({ amount }: SellNftForm) => {
    if (!publicKey || !signTransaction) {
      return
    }

    const buyerPrice = Number(amount) * LAMPORTS_PER_SOL
    const auctionHouse = new PublicKey(marketplace.auctionHouse.address)
    const authority = new PublicKey(marketplace.auctionHouse.authority)
    const auctionHouseFeeAccount = new PublicKey(
      marketplace.auctionHouse.auctionHouseFeeAccount
    )
    const treasuryMint = new PublicKey(marketplace.auctionHouse.treasuryMint)
    const tokenMint = new PublicKey(nft.mintAddress)

    const associatedTokenAccount = new PublicKey(
      nft.owner.associatedTokenAccountAddress
    )

    const [sellerTradeState, tradeStateBump] =
      await AuctionHouseProgram.findTradeStateAddress(
        publicKey,
        auctionHouse,
        associatedTokenAccount,
        treasuryMint,
        tokenMint,
        buyerPrice,
        1
      )

    const [metadata] = await MetadataProgram.findMetadataAccount(tokenMint)

    const [programAsSigner, programAsSignerBump] =
      await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()

    const [freeTradeState, freeTradeBump] =
      await AuctionHouseProgram.findTradeStateAddress(
        publicKey,
        auctionHouse,
        associatedTokenAccount,
        treasuryMint,
        tokenMint,
        0,
        1
      )

    const txt = new Transaction()

    const sellInstructionArgs = {
      tradeStateBump,
      freeTradeStateBump: freeTradeBump,
      programAsSignerBump: programAsSignerBump,
      buyerPrice,
      tokenSize: 1,
    }

    const sellInstructionAccounts = {
      wallet: publicKey,
      tokenAccount: associatedTokenAccount,
      metadata: metadata,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      sellerTradeState: sellerTradeState,
      freeSellerTradeState: freeTradeState,
      programAsSigner: programAsSigner,
    }

    const sellInstruction = createSellInstruction(
      sellInstructionAccounts,
      sellInstructionArgs
    )

    const [receipt, receiptBump] =
      await AuctionHouseProgram.findListingReceiptAddress(sellerTradeState)

    const printListingReceiptInstruction = createPrintListingReceiptInstruction(
      {
        receipt,
        bookkeeper: publicKey,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      {
        receiptBump,
      }
    )

    txt.add(sellInstruction).add(printListingReceiptInstruction)

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    let signed: Transaction | undefined = undefined

    try {
      signed = await signTransaction(txt)
    } catch (e: any) {
      toast.error(e.message)
      return
    }

    let signature: string | undefined = undefined

    try {
      toast('Sending the transaction to Solana.')

      signature = await connection.sendRawTransaction(signed.serialize())

      await connection.confirmTransaction(signature, 'confirmed')

      toast.success('The transaction was confirmed.')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      router.push(`/nfts/${nft.address}`)
    }
  }

  return (
    <form
      className="text-left grow mt-6"
      onSubmit={handleSubmit(sellNftTransaction)}
    >
      <h3 className="mb-6 text-xl font-bold md:text-2xl">Sell this Nft</h3>
      <label className="block mb-1">Price in SOL</label>
      <div className="prefix-input prefix-icon-sol">
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => {
            if (!nft) {
              return <></>
            }

            const amount = Number(value || 0) * LAMPORTS_PER_SOL

            const royalties = (amount * nft.sellerFeeBasisPoints) / 10000

            const auctionHouseFee =
              (amount * marketplace.auctionHouse.sellerFeeBasisPoints) / 10000

            return (
              <>
                <div className="mb-4 sol-input">
                  <input
                    autoFocus
                    value={value}
                    className="input"
                    onChange={(e: any) => {
                      onChange(e.target.value)
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      {nft.sellerFeeBasisPoints / 100}% creator royalty
                    </span>
                    <div className="flex justify-center gap-2">
                      <span className="icon-sol"></span>
                      <span>{royalties / LAMPORTS_PER_SOL}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      {marketplace.auctionHouse.sellerFeeBasisPoints / 100}%
                      transaction fee
                    </span>
                    <div className="flex justify-center gap-2">
                      <span className="icon-sol"></span>
                      <span>{auctionHouseFee / LAMPORTS_PER_SOL}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">You receive</span>
                    <div className="flex justify-center gap-2">
                      <span className="icon-sol"></span>
                      <span>
                        {(amount - royalties - auctionHouseFee) /
                          LAMPORTS_PER_SOL}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )
          }}
        />
      </div>
      <div className="grid flex-grow grid-cols-2 gap-4">
        <Link href={`/nfts/${nft?.address}`} passHref>
          <a>
            <Button block type={ButtonType.Secondary}>
              Cancel
            </Button>
          </a>
        </Link>
        <Button block htmlType="submit" loading={isSubmitting}>
          List for sale
        </Button>
      </div>
    </form>
  )
}

interface ListingNewLayoutProps {
  marketplace: Marketplace
  nft: Nft
  children: ReactElement
}

ListingNew.getLayout = function NftShowLayout({
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
