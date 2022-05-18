import { ReactElement, useState } from 'react'
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
import { Marketplace } from './../../../types.d'
import { useLogin } from '../../../hooks/login'
import { initMarketplaceSDK } from './../../../modules/marketplace'
import AdminMenu, { AdminMenuItemType } from '../../../components/AdminMenu'
import { SplToken } from '../../../components/SplToken'
import { AdminLayout } from '../../../layouts/Admin'

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

const AdminEditTokens = ({ marketplace }: AdminEditTokensProps) => {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const login = useLogin()

  const [showAdd, setShowAdd] = useState(false)

  const originalTokens = marketplace.auctionHouses.map(({ treasuryMint }) => ({
    address: treasuryMint,
  }))

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<MarketplaceForm>({
    defaultValues: {
      domain: `${marketplace.subdomain}.holaplex.market`,
      logo: { uri: marketplace.logoUrl },
      banner: { uri: marketplace.bannerUrl },
      subdomain: marketplace.subdomain,
      name: marketplace.name,
      description: marketplace.description,
      creators: marketplace.creators.map(({ creatorAddress }) => ({
        address: creatorAddress,
      })),
      transactionFee: marketplace.auctionHouse.sellerFeeBasisPoints,
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

    const client = initMarketplaceSDK(connection, wallet)

    toast('Saving changes...')

    // Remove auction houses corresponding to deleted tokens
    const auctionHouses = marketplace.auctionHouses
      .filter((ah) => tokens.some((token) => token.address === ah.treasuryMint))
      .map(({ address }) => ({
        address,
      }))

    // Add auction houses corresponding to new tokens
    const newTokens = tokens.filter(
      (token) => !originalTokens.some((ot) => ot.address === token.address)
    )
    if (newTokens.length > 0) {
      const newAuctionHouses = await client.createAuctionHouses(
        newTokens,
        transactionFee
      )
      auctionHouses.push(...newAuctionHouses)
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
      auctionHouses: auctionHouses,
    }

    try {
      await client.update(settings, transactionFee)

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
                {/* DUMMY DATA: */}
                {/* <li className="flex justify-between w-full">
                  <SplToken mint="So11111111111111111111111111111111111111112" />
                  <div className="flex gap-4 items-center">
                    <span className="font-medium text-sm text-gray-500">
                      Default
                    </span>
                    <Trash2
                      className="rounded-full bg-gray-700 p-1.5 text-white"
                      size="2rem"
                    />
                  </div>
                </li>
                <li className="flex justify-between w-full">
                  <SplToken mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" />
                  <div className="flex gap-4 items-center">
                    <span className="font-medium text-sm text-gray-100">
                      Make default
                    </span>
                    <Trash2
                      className="rounded-full bg-gray-700 p-1.5 text-white"
                      size="2rem"
                    />
                  </div>
                </li> */}
                {fields.map((field, index) => {
                  return (
                    <li
                      key={field.address}
                      className="flex justify-between w-full"
                    >
                      <SplToken mint={field.address} />
                      <div className="flex gap-4 items-center">
                        <span className="font-medium text-gray-100">
                          Make default
                        </span>
                        <Trash2
                          className="rounded-full bg-gray-700 p-1.5 text-white"
                          onClick={() => remove(index)}
                          size="2rem"
                        />
                      </div>
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
