import { useEffect, useState } from 'react'
import { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import cx from 'classnames'
import { isNil, equals } from 'ramda'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { AppProps } from 'next/app'
import { useForm, Controller } from 'react-hook-form'
import client from '../../client'
import {
  Marketplace,
  PresetEditFilter,
  AttributeFilter,
  MarketplaceCreator,
} from '../../types.d'
import EditMarketplace, {
  EditMarketplaceForm,
} from '../../components/Edit/Marketplace'
import EditCreators, { AddCreatorForm } from '../../components/Edit/Creators'
import FileUpload from 'src/components/Elements/Upload'
import ipfsSDK from '../../modules/ipfs/client'
import { Transaction } from '@solana/web3.js'
import { toast } from 'react-toastify'
import { programs } from '@metaplex/js'
import { RemoveCreatorForm } from 'src/components/Creator'
import { useRouter } from 'next/router'

const {
  metaplex: { Store, SetStoreV2, StoreConfig },
} = programs

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

interface InputData {
  name: string
  description: string
  // transactionFees: string
  logo: {
    url: string
    name?: string
    type?: string
  }
  banner: {
    url: string
    name?: string
    type?: string
  }
  creators: { address: string }[]
}

const EditPage: NextPage<EditPageProps> = ({ marketplace }) => {
  const { connection } = useConnection()
  const solana = useWallet()
  const router = useRouter()
  const { publicKey } = solana

  // console.log('Marketplace', marketplace)

  const refreshProps = () => {
    router.replace(router.asPath)
  }

  const { watch, register, control } = useForm<NftFilterForm>({
    defaultValues: { preset: PresetEditFilter.Marketplace },
  })

  const [preset, setPreset] = useState<PresetEditFilter | undefined>(
    PresetEditFilter.Marketplace
  )

  const onBannerUpdateClick = () => {}
  const onLogoUpdateClick = () => {}

  const getInputData = async (data: InputData) => {
    if (!solana || !publicKey) {
      return
    }
    const storePubkey = await Store.getPDA(publicKey)
    const storeConfigPubkey = await StoreConfig.getPDA(storePubkey)

    const input = {
      meta: {
        name: data.name,
        description: data.description,
      },
      theme: {
        logo: data.logo,
        banner: data.banner,
      },
      creators: data.creators,
      subdomain: marketplace.subdomain,
      address: {
        owner: publicKey,
        auctionHouse: marketplace.auctionHouse.address,
        store: storePubkey.toBase58(),
        storeConfig: storeConfigPubkey.toBase58(),
      },
    } as any
    return input
  }

  const onAddCreatorClicked = async (form: AddCreatorForm) => {
    toast('Saving changes...')
    const { walletAddress } = form

    const creators = [{ address: walletAddress }]
    marketplace.creators.forEach((creator) => {
      creators.push({ address: creator.creatorAddress })
    })

    const input = await getInputData({
      name: marketplace.name,
      description: marketplace.description,
      logo: { url: marketplace.logoUrl },
      banner: { url: marketplace.bannerUrl },
      creators,
    })

    updateMarketplace(input)
  }

  const onRemoveCreatorClicked = async (form: RemoveCreatorForm) => {
    toast('Saving changes...')
    const { walletAddress } = form
    const creatorsList = marketplace.creators.filter(
      (creator) => creator.creatorAddress !== walletAddress
    )

    let creators: { address: string }[] = []
    creatorsList.forEach((creator) => {
      creators.push({ address: creator.creatorAddress })
    })

    const input = await getInputData({
      name: marketplace.name,
      description: marketplace.description,
      logo: { url: marketplace.logoUrl },
      banner: { url: marketplace.bannerUrl },
      creators,
    })

    updateMarketplace(input)
  }

  const onUpdateClicked = async (form: EditMarketplaceForm) => {
    toast('Saving changes...')

    const { marketName, description, transactionFee } = form
    let creators: { address: string }[] = []
    marketplace.creators.forEach((creator) => {
      creators.push({ address: creator.creatorAddress })
    })

    const input = await getInputData({
      name: marketName,
      description: description,
      logo: { url: marketplace.logoUrl },
      banner: { url: marketplace.bannerUrl },
      creators,
    })

    updateMarketplace(input)
  }

  const updateMarketplace = async (data: any) => {
    if (!solana || !publicKey || !data) {
      return
    }
    const settings = new File([JSON.stringify(data)], 'storefront_settings')
    const { uri } = await ipfsSDK.uploadFile(settings)
    console.log('URI:', uri)

    const storePubkey = await Store.getPDA(publicKey)
    const storeConfigPubkey = await StoreConfig.getPDA(storePubkey)
    const setStorefrontV2Instructions = new SetStoreV2(
      {
        feePayer: publicKey,
      },
      {
        admin: publicKey,
        store: storePubkey,
        config: storeConfigPubkey,
        isPublic: false,
        settingsUri: uri,
      }
    )
    const transaction = new Transaction()
    transaction.add(setStorefrontV2Instructions)
    transaction.feePayer = publicKey
    transaction.recentBlockhash = (
      await connection.getRecentBlockhash()
    ).blockhash

    const signedTransaction = await solana.signTransaction!(transaction)
    const txtId = await connection.sendRawTransaction(
      signedTransaction.serialize()
    )
    console.log('Transaction ID:', txtId)
    if (txtId) await connection.confirmTransaction(txtId)
    console.log('Transaction confirmed')
    toast(<>Marketplace updated successfully!</>, { autoClose: 5000 })

    // Refetch server side props
    refreshProps()
  }

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
            <div className="text-sm">Marketplace</div>
            <div className="underline text-sm">Admin Dashboard</div>
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
          <button
            className="absolute -top-12 left-4 button small grow-0"
            onClick={onLogoUpdateClick}
          >
            Update
          </button>
          {/* <div className="absolute -top-12 left-4">
            <FileUpload dragger>
              <div className="button small grow-0 w-fit">Update</div>
            </FileUpload>
          </div> */}

          <button
            className="absolute -top-24 left-1/2 transform -translate-x-1/2 button small grow-0"
            onClick={onBannerUpdateClick}
          >
            Update
          </button>

          {/* <div className="absolute -top-24 left-1/2 transform -translate-x-1/2">
            <FileUpload dragger>
              <div className="button small grow-0 w-fit">Update</div>
            </FileUpload>
          </div> */}
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
            <EditMarketplace
              marketplace={marketplace}
              onUpdateClicked={onUpdateClicked}
            />
          )}
          {preset === PresetEditFilter.Creators && (
            <EditCreators
              marketplace={marketplace}
              onAddCreatorClicked={onAddCreatorClicked}
              onRemoveCreatorClicked={onRemoveCreatorClicked}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default EditPage
