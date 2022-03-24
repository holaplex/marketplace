import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import { isNil, not, or } from 'ramda'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Image as ImageIcon, User } from 'react-feather'
import { toast } from 'react-toastify'
import { AppProps } from 'next/app'
import { useForm, Controller } from 'react-hook-form'
import client from './../../../client'
import UploadFile from './../../../../src/components/UploadFile'
import WalletPortal from './../../../../src/components/WalletPortal'
import { Link } from 'react-router-dom'
import Button, { ButtonSize, ButtonType } from '../../../components/Button'
import { Marketplace } from './../../../types.d'
import { useLogin } from '../../../hooks/login'
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

interface AdminEditMarketplaceProps extends AppProps {
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
}

const AdminEditMarketplace = ({ marketplace }: AdminEditMarketplaceProps) => {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet
  const { connection } = useConnection()
  const login = useLogin()

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
    },
  })

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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col items-center text-white bg-gray-900">
        <div className="fixed top-0 z-10 flex items-center w-full justify-between p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
          <Link to="/">
            <button className="flex items-center justify-between gap-2 bg-gray-800 rounded-full sm:px-4 sm:py-2 sm:h-14 hover:bg-gray-600">
              <img
                className="w-12 h-12 md:w-8 md:h-8 rounded-full aspect-square"
                src={marketplace.logoUrl}
              />
              <div className="hidden sm:block">{marketplace.name}</div>
            </button>
          </Link>
          <div className="flex items-center">
            <div className="underline text-sm cursor-pointer mr-6">
              Admin Dashboard
            </div>
            <WalletPortal />
          </div>
        </div>
        <div className="relative w-full">
          <Controller
            control={control}
            name="banner"
            render={({ field: { onChange, name, value } }) => (
              <>
                <img
                  src={value.uri}
                  alt={marketplace.name}
                  className="object-cover w-full h-44 md:h-60 lg:h-80 xl:h-[20rem] 2xl:h-[28rem]"
                />
                <div className="absolute z-10 -bottom-5 left-1/2 transform -translate-x-1/2">
                  <UploadFile onChange={onChange} name={name} />
                </div>
              </>
            )}
          />
        </div>
        <div className="w-full max-w-[1800px] px-8">
          <div className="relative w-full mt-20 mb-1">
            <Controller
              control={control}
              name="logo"
              render={({ field: { onChange, name, value } }) => {
                return (
                  <>
                    <img
                      src={value.uri}
                      className="absolute border-4 border-gray-900 object-cover rounded-full w-16 h-16 -top-28 md:w-28 md:h-28 md:-top-32"
                    />
                    <div className="absolute -top-16 left-8 md:-top-12 md:left-14 transform -translate-x-1/2">
                      <UploadFile onChange={onChange} name={name} />
                    </div>
                  </>
                )
              }}
            />
          </div>
          <div className="flex flex-col md:flex-row">
            <div className="flex-col md:mr-10 space-y-2 md:w-80 sm:block">
              <div className="sticky top-0 max-h-screen py-4 overflow-auto">
                <ul className="flex flex-col flex-grow gap-2">
                  <li className="flex flex-row items-center bg-gray-800 p-2 rounded">
                    <ImageIcon color="white" className="mr-1" size="1rem" />{' '}
                    Marketplace
                  </li>
                  <li className="p-2 rounded">
                    <Link
                      className="w-full flex flex-row items-center"
                      to="/admin/creators/edit"
                    >
                      <User color="white" className="mr-1" size="1rem" />{' '}
                      Creators
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="grow flex flex-col items-center w-full pb-16">
              <div className="max-w-3xl w-full">
                <div className="grid grid-cols-12 md:flex-row items-start md:justify-between">
                  <h2 className="w-full mb-4 col-span-full md:col-span-6 lg:col-span-7">
                    Edit marketplace
                  </h2>
                  <div className="grid grid-cols-2 gap-2 col-span-full md:col-span-6 lg:col-span-5 w-full justify-end">
                    <Link to="/">
                      <Button
                        block
                        size={ButtonSize.Small}
                        type={ButtonType.Tertiary}
                        disabled={or(not(isDirty), isSubmitting)}
                      >
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      block
                      htmlType="submit"
                      size={ButtonSize.Small}
                      loading={isSubmitting}
                      disabled={or(not(isDirty), isSubmitting)}
                    >
                      Save changes
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col max-h-screen py-4 overflow-auto">
                  <label className="text-lg mt-9">Domain</label>
                  <span className="mb-2 text-sm text-gray-300">
                    Your domain is managed by Holaplex. If you need to change
                    it, please{' '}
                    <a
                      href="mailto:hola@holaplex.com?subject=Change Subdomain"
                      className="underline"
                    >
                      contact us.
                    </a>
                  </span>
                  <input
                    className="w-full px-3 py-2 text-gray-100 text-right text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
                    {...register('domain', { disabled: true })}
                  />
                  {errors.domain && <span>This field is required</span>}

                  <label className="mb-2 text-lg mt-9">Market Name</label>
                  <input
                    className="w-full px-3 py-2 text-gray-100 text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
                    {...register('name', { required: true })}
                  />
                  {errors.name && <span>This field is required</span>}

                  <label className="mb-2 text-lg mt-9">Description</label>
                  <input
                    className="w-full px-3 py-2 text-gray-100 text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
                    {...register('description', { required: true })}
                  />
                  {errors.description && <span>This field is required</span>}

                  <label className="text-lg mt-9">Transaction fee</label>
                  <span className="mb-2 text-sm text-gray-300">
                    This is a fee added to all sales. Funds go to the auction
                    house wallet. 1% is equal to 100 basis points.
                  </span>
                  <input
                    type="number"
                    className="w-full px-3 py-2 text-gray-100 text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
                    {...register('transactionFee')}
                  />
                  {errors.transactionFee && <span>This field is required</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

export default AdminEditMarketplace
