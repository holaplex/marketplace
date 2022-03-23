import { useEffect, useState } from 'react'
import { NextPage, NextPageContext } from 'next'
import { gql } from '@apollo/client'
import cx from 'classnames'
import { isNil, equals } from 'ramda'
import {
  useConnection,
  useWallet,
  WalletContextState,
} from '@solana/wallet-adapter-react'
import { AppProps } from 'next/app'
import { useForm, Controller } from 'react-hook-form'
import client from '../../client'

import EditCreators, { AddCreatorForm } from '../../components/Admin/Creators'
import ipfsSDK from '../../modules/ipfs/client'
import { Transaction } from '@solana/web3.js'
import { toast } from 'react-toastify'
import { programs, Wallet } from '@metaplex/js'
import { RemoveCreatorForm } from 'src/components/Creator'
import { useRouter } from 'next/router'
import { updateAuctionHouse } from '@/modules/auction-house'
import UploadFile from 'src/components/UploadFile'
import WalletPortal from 'src/components/WalletPortal'
import { Link, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { EditMarketplaceForm } from 'src/components/Admin/Marketplace'
import EditMarketplace from 'src/components/Admin/Marketplace/EditMarketplace'
import { AttributeFilter, Marketplace, PresetEditFilter } from '../../types.d'

const {
  metaplex: { Store, SetStoreV2, StoreConfig },
} = programs

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN
const PATH_EDIT_MARKETPLACE = '/admin/marketplace/edit'
const PATH_EDIT_CREATORS = '/admin/creators/edit'

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

interface GetMarketplace {
  marketplace: Marketplace | null
}

interface EditPageProps extends AppProps {
  marketplace: Marketplace
}

interface EditFilterForm {
  preset: PresetEditFilter
}

interface NewData {
  name: string
  description: string
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

const AdminPage: NextPage<EditPageProps> = ({ marketplace }) => {
  const { connection } = useConnection()
  const solana = useWallet()
  const { publicKey } = solana
  const router = useRouter()
  const [logo, setLogo] = useState<string>(marketplace.logoUrl)
  const [banner, setBanner] = useState<string>(marketplace.bannerUrl)
  // const [showEditMarketplace, setShowEditMarketplace] = useState(
  //   router.asPath == PATH_EDIT_CREATORS ? false : true
  // )

  const navigate = useNavigate()

  const [preset, setPreset] = useState<PresetEditFilter | undefined>(
    router.asPath == PATH_EDIT_CREATORS
      ? PresetEditFilter.Creators
      : PresetEditFilter.Marketplace
  )

  const { watch, control } = useForm<EditFilterForm>({
    defaultValues: {
      preset: preset,
    },
  })

  const refreshProps = () => {
    router.replace(router.asPath)
  }

  const onSaveChangesClicked = async (form: EditMarketplaceForm) => {
    const { marketName, description, transactionFee } = form
    let creators: { address: string }[] = []
    marketplace.creators.forEach((creator) => {
      creators.push({ address: creator.creatorAddress })
    })

    updateMarketplace(
      {
        name: marketName,
        description: description,
        logo: { url: logo },
        banner: { url: banner },
        creators,
      },
      transactionFee
    )
  }

  const onAddCreatorClicked = async (form: AddCreatorForm) => {
    const { walletAddress } = form

    const creators = [{ address: walletAddress }]
    marketplace.creators.forEach((creator) => {
      creators.push({ address: creator.creatorAddress })
    })

    updateMarketplace({
      name: marketplace.name,
      description: marketplace.description,
      logo: { url: marketplace.logoUrl },
      banner: { url: marketplace.bannerUrl },
      creators,
    })
  }

  const onRemoveCreatorClicked = async (form: RemoveCreatorForm) => {
    const { walletAddress } = form
    const creatorsList = marketplace.creators.filter(
      (creator) => creator.creatorAddress !== walletAddress
    )

    let creators: { address: string }[] = []
    creatorsList.forEach((creator) => {
      creators.push({ address: creator.creatorAddress })
    })

    updateMarketplace({
      name: marketplace.name,
      description: marketplace.description,
      logo: { url: marketplace.logoUrl },
      banner: { url: marketplace.bannerUrl },
      creators,
    })
  }

  const updateMarketplace = async (data: NewData, transactionFee?: number) => {
    if (!solana || !publicKey || !data) {
      return
    }
    toast('Saving changes...')

    const storePubkey = await Store.getPDA(publicKey)
    const storeConfigPubkey = await StoreConfig.getPDA(storePubkey)

    const newStoreData = {
      meta: {
        name: data.name,
        description: data.description,
      },
      theme: {
        logo: {
          url: data.logo,
        },
        banner: { url: data.banner },
      },
      creators: data.creators,
      subdomain: marketplace.subdomain,
      address: {
        owner: publicKey,
        auctionHouse: marketplace.auctionHouse.address,
        store: storePubkey.toBase58(),
        storeConfig: storeConfigPubkey.toBase58(),
      },
    }

    // console.log('new store data', newStoreData)

    try {
      const settings = new File(
        [JSON.stringify(newStoreData)],
        'storefront_settings'
      )
      const { uri } = await ipfsSDK.uploadFile(settings)
      console.log('URI:', uri)

      let auctionHouseUpdateInstruction
      if (
        transactionFee &&
        transactionFee != marketplace.auctionHouse.sellerFeeBasisPoints
      ) {
        auctionHouseUpdateInstruction = await updateAuctionHouse({
          wallet: solana as Wallet,
          sellerFeeBasisPoints: transactionFee,
        })
      }

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
      if (auctionHouseUpdateInstruction) {
        transaction.add(auctionHouseUpdateInstruction)
      }
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
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  useEffect(() => {
    const subscription = watch(({ preset }) => {
      console.log(preset)
      setPreset(preset)
      switch (preset) {
        case PresetEditFilter.Marketplace:
          navigate('/admin/marketplace/edit')
          break
        case PresetEditFilter.Creators:
          navigate('/admin/creators/edit')
          break
        default:
          break
      }
    })
    return () => subscription.unsubscribe()
  }, [watch])

  return (
    <div className="flex flex-col items-center text-white bg-gray-900">
      <div className="relative w-full">
        <div className="absolute right-6 top-[25px]">
          <div className="flex items-center gap-6">
            <Link to={'/'}>
              <div className="text-sm">Marketplace</div>
            </Link>
            <div className="underline text-sm cursor-pointer">
              Admin Dashboard
            </div>
            <div>
              <WalletPortal />
            </div>
          </div>
        </div>
        <img
          src={banner}
          alt={marketplace.name}
          className="object-cover w-full h-80"
        />
      </div>
      <div className="w-full max-w-[1800px] px-8">
        <div className="relative w-full mt-20 mb-1">
          <img
            src={logo}
            alt={marketplace.name}
            className="absolute border-4 border-gray-900 rounded-full w-28 h-28 -top-32"
          />

          {preset == PresetEditFilter.Marketplace && (
            <div className="absolute -top-12 left-14 transform -translate-x-1/2">
              <UploadFile setNewFileUrl={setLogo} type="logo" />
            </div>
          )}
          {preset == PresetEditFilter.Marketplace && (
            <div className="absolute -top-24 left-1/2 transform -translate-x-1/2">
              <UploadFile setNewFileUrl={setBanner} type="banner" />
            </div>
          )}
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
                        htmlFor="preset-marketplace"
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
                          id="preset-marketplace"
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
                        htmlFor="preset-creators"
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
                          id="preset-creators"
                        />
                        Creators
                      </label>
                    )}
                  />
                </li>
              </ul>
            </form>
          </div>
          <Routes>
            <Route
              path="/admin"
              element={<Navigate replace to="/admin/marketplace/edit" />}
            />
            <Route
              path="/admin/marketplace/edit"
              element={
                <EditMarketplace
                  marketplace={marketplace}
                  onUpdateClicked={onSaveChangesClicked}
                />
              }
            />
            <Route
              path="/admin/creators/edit"
              element={
                <EditCreators
                  marketplace={marketplace}
                  onAddCreatorClicked={onAddCreatorClicked}
                  onRemoveCreatorClicked={onRemoveCreatorClicked}
                />
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
