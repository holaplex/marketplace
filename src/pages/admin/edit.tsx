import { useEffect, useState } from 'react'
import { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import cx from 'classnames'
import { isNil, equals } from 'ramda'
import { useWallet } from '@solana/wallet-adapter-react'
import { AppProps } from 'next/app'
import { useForm, Controller } from 'react-hook-form'
import client from '../../client'
import { Marketplace, PresetEditFilter, AttributeFilter } from '../../types.d'
import EditMarketplace from '../../components/Edit/Marketplace'
import EditCreators from '../../components/Edit/Creators'
import FileUpload from 'src/components/Elements/Upload'

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

export async function getServerSideProps({ req }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain']

  const {
    data: { marketplace },
  } = await client.query<GetMarketplace>({
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

interface GetMarketplace {
  marketplace: Marketplace | null
}

interface EditPageProps extends AppProps {
  marketplace: Marketplace
}

interface NftFilterForm {
  attributes: AttributeFilter[]
  preset: PresetEditFilter
}

const EditPage: NextPage<EditPageProps> = ({ marketplace }) => {
  const { publicKey, connected } = useWallet()

  const { watch, register, control } = useForm<NftFilterForm>({
    defaultValues: { preset: PresetEditFilter.Marketplace },
  })

  const [preset, setPreset] = useState<PresetEditFilter | undefined>(
    PresetEditFilter.Marketplace
  )

  const onBannerUpdateClick = () => {}
  const onLogoUpdateClick = () => {}

  useEffect(() => {
    const subscription = watch(({ preset }) => {
      console.log(preset)
      setPreset(preset)
    })
    return () => subscription.unsubscribe()
  }, [watch])

  return (
    <div className="flex flex-col items-center text-white bg-gray-900">
      <div className="relative w-full">
        <div className="absolute right-8 top-8">
          <div className="flex gap-2">
            <text className="text-sm">Marketplace</text>
            <text className="underline text-sm">Admin Dashboard</text>
          </div>
        </div>
        <img
          src={marketplace.bannerUrl}
          alt={marketplace.name}
          className="object-cover w-full h-80"
        />
      </div>
      <div className="w-full max-w-[1800px] px-8">
        <div className="relative w-full mt-20 mb-1">
          <img
            src={marketplace.logoUrl}
            alt={marketplace.name}
            className="absolute border-4 border-gray-900 rounded-full w-28 h-28 -top-32"
          />
          {/* <button
            className="absolute -top-12 left-4 button small grow-0"
            onClick={onLogoUpdateClick}
          >
            Update
          </button> */}
          <div className="absolute -top-12 left-4">
            <FileUpload dragger>
              <div className="button small grow-0 w-fit">Update</div>
            </FileUpload>
          </div>

          {/* <button
            className="absolute -top-24 left-1/2 transform -translate-x-1/2 button small grow-0"
            onClick={onBannerUpdateClick}
          >
            Update
          </button> */}
          <div className="absolute -top-24 left-1/2 transform -translate-x-1/2">
            <FileUpload dragger>
              <div className="button small grow-0 w-fit">Update</div>
            </FileUpload>
          </div>
        </div>
        <div className="flex">
          <div className="flex-row flex-none hidden mr-10 space-y-2 w-80 sm:block">
            <form
              onSubmit={(e) => {
                e.preventDefault()
              }}
              className="sticky top-0 max-h-screen py-4 overflow-auto"
            >
              <ul className="flex flex-col flex-grow mb-6">
                <li>
                  <Controller
                    control={control}
                    name="preset"
                    render={({ field: { value, onChange } }) => (
                      <label
                        htmlFor="preset-all"
                        className={cx(
                          'flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800',
                          {
                            'bg-gray-800': equals(
                              PresetEditFilter.Marketplace,
                              value
                            ),
                          }
                        )}
                      >
                        <input
                          onChange={onChange}
                          className="hidden"
                          type="radio"
                          name="preset"
                          value={PresetEditFilter.Marketplace}
                          id="preset-all"
                        />
                        Marketplace
                      </label>
                    )}
                  />
                </li>
                <li>
                  <Controller
                    control={control}
                    name="preset"
                    render={({ field: { value, onChange } }) => (
                      <label
                        htmlFor="preset-listed"
                        className={cx(
                          'flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800',
                          {
                            'bg-gray-800': equals(
                              PresetEditFilter.Creators,
                              value
                            ),
                          }
                        )}
                      >
                        <input
                          onChange={onChange}
                          className="hidden"
                          type="radio"
                          name="preset"
                          value={PresetEditFilter.Creators}
                          id="preset-listed"
                        />
                        Creators
                      </label>
                    )}
                  />
                </li>
              </ul>
            </form>
          </div>
          {preset === PresetEditFilter.Marketplace && (
            <EditMarketplace marketplace={marketplace} />
          )}
          {preset === PresetEditFilter.Creators && (
            <EditCreators marketplace={marketplace} />
          )}
        </div>
      </div>
    </div>
  )
}

export default EditPage
