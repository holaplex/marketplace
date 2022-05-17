import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import { isNil, not, or } from 'ramda'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'react-toastify'
import { AppProps } from 'next/app'
import { useForm, Controller } from 'react-hook-form'
import client from './../../../client'
import UploadFile from './../../../../src/components/UploadFile'
import Link from 'next/link'
import Button, { ButtonSize, ButtonType } from '../../../components/Button'
import { Marketplace } from './../../../types.d'
import { useLogin } from '../../../hooks/login'
import { initMarketplaceSDK } from './../../../modules/marketplace'
import { ReactElement } from 'react'
import { AdminLayout } from 'src/layouts/Admin'
import AdminMenu, { AdminMenuItemType } from '../../../components/AdminMenu'

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
    <form className="w-full">
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
              <div className="absolute z-10 transform -translate-x-1/2 -bottom-5 left-1/2">
                <UploadFile onChange={onChange} name={name} />
              </div>
            </>
          )}
        />
      </div>
      <div className="w-full max-w-[1800px] px-6 md:px-12">
        <div className="relative w-full mt-20 mb-1">
          <Controller
            control={control}
            name="logo"
            render={({ field: { onChange, name, value } }) => {
              return (
                <>
                  <img
                    src={value.uri}
                    className="absolute object-cover w-16 h-16 bg-gray-900 border-4 border-gray-900 rounded-full -top-28 md:w-28 md:h-28 md:-top-32"
                  />
                  <div className="absolute transform -translate-x-1/2 -top-16 left-8 md:-top-12 md:left-14">
                    <UploadFile onChange={onChange} name={name} />
                  </div>
                </>
              )
            }}
          />
        </div>
        <div className="flex flex-col md:flex-row">
          <div className="flex-col space-y-2 md:mr-10 md:w-80 sm:block">
            <div className="sticky top-0 max-h-screen py-4 overflow-auto">
              <AdminMenu selectedItem={AdminMenuItemType.Marketplace} />
            </div>
          </div>
          <div className="flex flex-col items-center w-full pb-16 grow">
            <div className="w-full max-w-3xl">
              <div className="grid items-start grid-cols-12 md:flex-row md:justify-between">
                <h2 className="w-full mb-4 col-span-full md:col-span-6 lg:col-span-7">
                  Edit marketplace
                </h2>
                <div className="grid justify-end w-full grid-cols-2 gap-2 col-span-full md:col-span-6 lg:col-span-5">
                  <Link href="/">
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
                    onClick={handleSubmit(onSubmit)}
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
                  Your domain is managed by Holaplex. If you need to change it,
                  please{' '}
                  <a
                    href="mailto:hola@holaplex.com?subject=Change Subdomain"
                    className="underline"
                  >
                    contact us.
                  </a>
                </span>
                <input
                  className="w-full px-3 py-2 text-base text-right text-gray-100 bg-gray-900 border border-gray-700 rounded-sm focus:outline-none"
                  {...register('domain', { disabled: true })}
                />
                {errors.domain && <span>This field is required</span>}

                <label className="mb-2 text-lg mt-9">Market Name</label>
                <input
                  className="w-full px-3 py-2 text-base text-gray-100 bg-gray-900 border border-gray-700 rounded-sm focus:outline-none"
                  {...register('name', { required: true })}
                />
                {errors.name && <span>This field is required</span>}

                <label className="mb-2 text-lg mt-9">Description</label>
                <textarea
                  className="w-full px-3 py-2 text-base text-gray-100 bg-gray-900 border border-gray-700 rounded-sm focus:outline-none"
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
                  className="w-full px-3 py-2 text-base text-gray-100 bg-gray-900 border border-gray-700 rounded-sm focus:outline-none"
                  {...register('transactionFee')}
                />
                {errors.transactionFee && <span>This field is required</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

interface AdminEditMarketplaceLayoutProps {
  marketplace: Marketplace
  children: ReactElement
}

AdminEditMarketplace.getLayout = function GetLayout({
  marketplace,
  children,
}: AdminEditMarketplaceLayoutProps): ReactElement {
  return <AdminLayout marketplace={marketplace}>{children}</AdminLayout>
}

export default AdminEditMarketplace
