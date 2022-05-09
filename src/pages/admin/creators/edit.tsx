import { useState } from 'react'
import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import { isNil } from 'ramda'
import { Image as ImageIcon, DollarSign, User } from 'react-feather'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-toastify'
import { AppProps } from 'next/app'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import client from './../../../client'
import WalletPortal from './../../../../src/components/WalletPortal'
import Link from 'next/link'
import Button, { ButtonSize, ButtonType } from '../../../components/Button'
import { Marketplace } from './../../../types.d'
import { useLogin } from '../../../hooks/login'
import { truncateAddress } from '../../../modules/address'
import { initMarketplaceSDK } from './../../../modules/marketplace'

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

interface AdminEditCreatorsProps extends AppProps {
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
  creator: string
}

const AdminEditCreators = ({ marketplace }: AdminEditCreatorsProps) => {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const login = useLogin()

  const [showAdd, setShowAdd] = useState(false)

  const {
    register,
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
      creator: '',
    },
  })

  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray(
    {
      control,
      name: 'creators',
    }
  )

  const onSubmit = async ({
    name,
    banner,
    logo,
    description,
    transactionFee,
    creators,
  }: MarketplaceForm) => {
    if (!publicKey || !signTransaction || !wallet) {
      toast.error('Wallet not connected')

      login()

      return
    }

    const client = initMarketplaceSDK(connection, wallet)

    toast('Saving changes...')

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
      address: {
        auctionHouse: marketplace.auctionHouse.address,
      },
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
    <div className="flex flex-col items-center text-white bg-gray-900">
      <div className="fixed top-0 z-10 flex items-center justify-between w-full p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
        <Link href="/">
          <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full align sm:px-4 sm:py-2 sm:h-14 hover:bg-gray-600 transition duration-100 transform hover:scale-[1.02]">
            <img
              className="w-12 h-12 rounded-full md:w-8 md:h-8 aspect-square"
              src={marketplace.logoUrl}
            />
            <div className="hidden sm:block">{marketplace.name}</div>
          </button>
        </Link>
        <div className="flex items-center gap-6">
          <div className="text-sm underline cursor-pointer">
            Admin Dashboard
          </div>
          <WalletPortal />
        </div>
      </div>
      <div className="relative w-full">
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
              <ul className="flex flex-col flex-grow gap-2">
                <li className="block p-2 rounded">
                  <Link
                    className="flex flex-row items-center w-full"
                    href="/admin/marketplace/edit"
                  >
                    <ImageIcon color="white" className="mr-1" size="1rem" />{' '}
                    Marketplace
                  </Link>
                </li>
                <li className="flex flex-row items-center p-2 bg-gray-800 rounded">
                  <User color="white" className="mr-1" size="1rem" /> Creators
                </li>
                <li className="block p-2 rounded">
                  <Link
                    className="flex flex-row items-center w-full"
                    href="/admin/financials/edit"
                  >
                    <DollarSign color="white" className="mr-1" size="1rem" />{' '}
                    Financials
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center w-full pb-16 grow">
            <div className="w-full max-w-3xl">
              <div className="grid items-start grid-cols-12 mb-10 md:mb-0 md:flex-row md:justify-between">
                <div className="w-full mb-4 col-span-full md:col-span-8 lg:col-span-10">
                  <h2>Creators</h2>
                  <p className="text-gray-300">
                    Manage the creators whose work will be available on your
                    marketplace.
                  </p>
                </div>
                <div className="flex justify-end col-span-full md:col-span-4 lg:col-span-2">
                  <Button
                    block
                    onClick={() => setShowAdd(!!!showAdd)}
                    type={showAdd ? ButtonType.Tertiary : ButtonType.Primary}
                    size={ButtonSize.Small}
                  >
                    {showAdd ? 'Cancel' : 'Add Creators'}
                  </Button>
                </div>
              </div>
              {showAdd && (
                <Controller
                  control={control}
                  name="creator"
                  render={({ field: { onChange, value } }) => {
                    return (
                      <>
                        <label className="block mb-2 text-lg">
                          Add creator by wallet address
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
                          placeholder="SOL wallet address"
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
                      {truncateAddress(field.address)}
                      <Button
                        size={ButtonSize.Small}
                        onClick={() => remove(index)}
                      >
                        Remove
                      </Button>
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
                    Update creators
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

export default AdminEditCreators
