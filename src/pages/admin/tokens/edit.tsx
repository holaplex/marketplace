import { ReactElement, useMemo, useState } from 'react'
import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import { isNil } from 'ramda'
import { Trash2 } from 'react-feather'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-toastify'
import { AppProps } from 'next/app'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import client from './../../../client'
import Button, { ButtonSize, ButtonType } from '../../../components/Button'
import { useLogin } from '../../../hooks/login'
import AdminMenu, { AdminMenuItemType } from '../../../components/AdminMenu'
import { SplToken } from '../../../components/SplToken'
import { AdminLayout } from '../../../layouts/Admin'
import { Wallet } from '@metaplex/js'
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { initMarketplaceSDK, Marketplace } from '@holaplex/marketplace-js-sdk'
import { createCreateAuctionHouseInstruction } from '@metaplex-foundation/mpl-auction-house/dist/src/generated/instructions'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'
import { useTokenList } from 'src/hooks/tokenList'
import { isSol } from 'src/modules/sol'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

interface GetMarketplace {
  marketplace: Marketplace | null
}

export async function getServerSideProps({ req }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain']

  const {
    data: { marketplace },
  } = await client.query<GetMarketplace>({
    fetchPolicy: 'no-cache',
    query: gql`
      query GetMarketplace($subdomain: String!) {
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
      }
    `,
    variables: {
      subdomain: subdomain || SUBDOMAIN,
    },
  })

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

interface AdminEditTokensProps extends AppProps {
  marketplace: Marketplace
}

interface MarketplaceForm {
  domain: string
  logo: { uri: string; type?: string; name?: string }
  banner: { uri: string; type?: string; name?: string }
  subdomain: string
  name: string
  description: string
  transactionFee: number
  creators: { address: string }[]
  tokens: { address: string }[]
  token: string
}

interface AssembleAuctionHousesResult {
  auctionHouses: { address: string }[]
  instructions: TransactionInstruction[]
}

async function assembleAuctionHouses(
  wallet: Wallet,
  tokens: { address: string }[],
  sellerFeeBasisPoints: number
): Promise<AssembleAuctionHousesResult> {
  const publicKey = wallet.publicKey

  const promises = tokens.map(async (token) => {
    const canChangeSalePrice = false
    const requiresSignOff = false
    const treasuryWithdrawalDestination = undefined
    const feeWithdrawalDestination = undefined
    const treasuryMint = token.address

    const twdKey = treasuryWithdrawalDestination
      ? new PublicKey(treasuryWithdrawalDestination)
      : publicKey

    const fwdKey = feeWithdrawalDestination
      ? new PublicKey(feeWithdrawalDestination)
      : publicKey

    const tMintKey = treasuryMint ? new PublicKey(treasuryMint) : NATIVE_MINT

    const twdAta = tMintKey.equals(NATIVE_MINT)
      ? twdKey
      : (
          await AuctionHouseProgram.findAssociatedTokenAccountAddress(
            tMintKey,
            twdKey
          )
        )[0]

    const [auctionHouse, bump] =
      await AuctionHouseProgram.findAuctionHouseAddress(publicKey, tMintKey)

    const [feeAccount, feePayerBump] =
      await AuctionHouseProgram.findAuctionHouseFeeAddress(auctionHouse)

    const [treasuryAccount, treasuryBump] =
      await AuctionHouseProgram.findAuctionHouseTreasuryAddress(auctionHouse)

    const auctionHouseCreateInstruction = createCreateAuctionHouseInstruction(
      {
        treasuryMint: tMintKey,
        payer: wallet.publicKey,
        authority: wallet.publicKey,
        feeWithdrawalDestination: fwdKey,
        treasuryWithdrawalDestination: twdAta,
        treasuryWithdrawalDestinationOwner: twdKey,
        auctionHouse,
        auctionHouseFeeAccount: feeAccount,
        auctionHouseTreasury: treasuryAccount,
      },
      {
        bump,
        feePayerBump,
        treasuryBump,
        sellerFeeBasisPoints,
        requiresSignOff,
        canChangeSalePrice,
      }
    )
    return { auctionHouseCreateInstruction, address: auctionHouse.toBase58() }
  })

  const result = await Promise.all(promises)

  const auctionHouses: { address: string }[] = []
  const instructions: TransactionInstruction[] = []

  result.forEach((r) => {
    auctionHouses.push({ address: r.address })
    instructions.push(r.auctionHouseCreateInstruction)
  })

  return { auctionHouses, instructions }
}

const AdminEditTokens = ({ marketplace }: AdminEditTokensProps) => {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const login = useLogin()
  const sdk = useMemo(
    () => initMarketplaceSDK(connection, wallet as Wallet),
    [connection, wallet]
  )
  const tokenMap = useTokenList()
  const [showAdd, setShowAdd] = useState(false)

  const originalTokens = marketplace.auctionHouses?.map(({ treasuryMint }) => ({
    address: treasuryMint,
  }))

  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<MarketplaceForm>({
    defaultValues: {
      domain: `${marketplace.subdomain}.holaplex.market`,
      logo: { uri: marketplace.logoUrl },
      banner: { uri: marketplace.bannerUrl },
      subdomain: marketplace.subdomain,
      name: marketplace.name,
      description: marketplace.description,
      creators: marketplace.creators?.map(({ creatorAddress }) => ({
        address: creatorAddress,
      })),
      transactionFee: marketplace.auctionHouses[0].sellerFeeBasisPoints,
      tokens: originalTokens,
      token: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tokens',
  })

  const onSubmit = async ({
    name,
    banner,
    logo,
    description,
    transactionFee,
    creators,
    tokens,
  }: MarketplaceForm) => {
    if (!publicKey || !signTransaction || !wallet) {
      toast.error('Wallet not connected')

      login()

      return
    }

    toast('Saving changes...')
    // Remove auction houses corresponding to deleted tokens
    const auctionHouses = marketplace.auctionHouses
      ?.filter((ah) =>
        tokens.some((token) => token.address === ah.treasuryMint)
      )
      .map(({ address }) => ({
        address,
      }))

    // Add auction houses corresponding to new tokens
    const newTokens = tokens.filter(
      (token) => !originalTokens?.some((ot) => ot.address === token.address)
    )

    const newAuctionHousesInstructions: TransactionInstruction[] = []

    if (newTokens.length > 0) {
      const result = await assembleAuctionHouses(
        wallet as Wallet,
        newTokens,
        transactionFee
      )
      auctionHouses?.push(...result.auctionHouses)
      newAuctionHousesInstructions.push(...result.instructions)
    }

    const settings = {
      meta: {
        name,
        description,
      },
      theme: {
        logo: {
          name: logo.name,
          type: logo.type,
          url: logo.uri,
        },
        banner: {
          name: banner.name,
          type: banner.type,
          url: banner.uri,
        },
      },
      creators,
      subdomain: marketplace.subdomain,
      address: {},
      auctionHouses: auctionHouses,
    }

    try {
      const transaction = new Transaction()
      newAuctionHousesInstructions.forEach(
        (instruction: TransactionInstruction) => {
          transaction.add(instruction)
        }
      )

      await sdk
        .transaction()
        .add(transaction)
        .add(sdk.update(settings, transactionFee))
        .send()

      // const updateInstruction = await sdk.update(settings, transactionFee)
      // transaction.add(updateInstruction)

      // transaction.feePayer = publicKey
      // transaction.recentBlockhash = (
      //   await connection.getRecentBlockhash()
      // ).blockhash
      // const signedTransaction = await wallet.signTransaction!(transaction)
      // const txtId = await connection.sendRawTransaction(
      //   signedTransaction.serialize()
      // )
      // if (txtId) await connection.confirmTransaction(txtId, 'confirmed')

      toast.success(
        <>
          Marketplace updated successfully! It may take a few moments for the
          change to go live.
        </>,
        { autoClose: 5000 }
      )
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="w-full">
      <div>
        <img
          src={marketplace.bannerUrl}
          alt={marketplace.name}
          className="object-cover w-full h-44 md:h-60 lg:h-80 xl:h-[20rem] 2xl:h-[28rem]"
        />
      </div>
      <div className="w-full max-w-[1800px] px-6 md:px-12">
        <div className="relative w-full mt-20 mb-1">
          <img
            src={marketplace.logoUrl}
            className="absolute object-cover w-16 h-16 border-4 border-gray-900 rounded-full -top-28 md:w-28 md:h-28 md:-top-32"
          />
        </div>
        <div className="flex flex-col md:flex-row">
          <div className="flex-col space-y-2 md:mr-10 md:w-80 sm:block">
            <div className="sticky top-0 max-h-screen py-4 overflow-auto">
              <AdminMenu selectedItem={AdminMenuItemType.Tokens} />
            </div>
          </div>
          <div className="flex flex-col items-center w-full pb-16 grow">
            <div className="w-full max-w-3xl">
              <div className="grid items-start grid-cols-12 mb-10 md:mb-0 md:flex-row md:justify-between">
                <div className="w-full mb-4 col-span-full md:col-span-8 lg:col-span-10">
                  <h2>Suppoted tokens</h2>
                  <p className="text-gray-300">
                    This is a list of all tokens supported by your marketplace.
                    Users will be able to list NFTs for sale in any of the
                    tokens supported.
                  </p>
                </div>
                <div className="flex justify-end col-span-full md:col-span-4 lg:col-span-2">
                  <Button
                    block
                    onClick={() => setShowAdd(!!!showAdd)}
                    type={showAdd ? ButtonType.Tertiary : ButtonType.Primary}
                    size={ButtonSize.Small}
                  >
                    {showAdd ? 'Cancel' : 'Add token'}
                  </Button>
                </div>
              </div>
              {showAdd && (
                <Controller
                  control={control}
                  name="token"
                  render={({ field: { onChange, value } }) => {
                    return (
                      <>
                        <label className="block mb-2 text-lg">
                          Add token by mint address
                        </label>
                        <input
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key !== 'Enter') {
                              return
                            }
                            append({ address: value })
                            onChange('')
                          }}
                          placeholder="Mint address"
                          className="w-full px-3 py-2 mb-10 text-base text-gray-100 bg-gray-900 border border-gray-700 rounded-sm focus:outline-none"
                          value={value}
                          onChange={onChange}
                        />
                      </>
                    )
                  }}
                />
              )}
              <ul className="flex flex-col max-h-screen gap-6 py-4 mb-10">
                {fields.map((field, index) => {
                  return (
                    <li
                      key={field.address}
                      className="flex justify-between w-full"
                    >
                      <SplToken
                        mintAddress={field.address}
                        tokenInfo={tokenMap.get(field.address)}
                      />
                      {!isSol(field.address) && (
                        <div className="flex gap-4 items-center">
                          {/* <span className="font-medium text-gray-100">
-                          Make default
-                        </span> */}
                          <Trash2
                            className="rounded-full bg-gray-700 p-1.5 text-white"
                            onClick={() => remove(index)}
                            size="2rem"
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              <form>
                {isDirty && (
                  <Button
                    block
                    htmlType="submit"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    loading={isSubmitting}
                  >
                    Update tokens
                  </Button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AdminEditTokensLayoutProps {
  marketplace: Marketplace
  children: ReactElement
}

AdminEditTokens.getLayout = function GetLayout({
  marketplace,
  children,
}: AdminEditTokensLayoutProps): ReactElement {
  return <AdminLayout marketplace={marketplace}>{children}</AdminLayout>
}

export default AdminEditTokens
