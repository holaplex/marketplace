import { NextPageContext } from 'next'
import { gql } from '@apollo/client'
import cx from 'classnames'
import { isNil } from 'ramda'
import {
  useConnection,
  useWallet,
} from '@solana/wallet-adapter-react'
import { toast } from 'react-toastify'
import { AppProps } from 'next/app'
import { programs, Wallet } from '@metaplex/js'
import { Transaction, TransactionInstruction } from '@solana/web3.js'
import { useForm, Controller } from 'react-hook-form'
import client from './../../../client'
import ipfsSDK from './../../../../src/modules/ipfs/client'
import { updateAuctionHouse } from './../../../../src/modules/auction-house'
import UploadFile from './../../../../src/components/UploadFile'
import WalletPortal from './../../../../src/components/WalletPortal'
import { Link, useNavigate } from 'react-router-dom'
import Button, { ButtonSize } from '../../../components/Button';
import { Marketplace, MarketplaceCreator } from './../../../types.d'
import { useLogin } from '../../../hooks/login'


const {
  metaplex: { Store, SetStoreV2, StoreConfig },
} = programs

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

interface GetMarketplace {
  marketplace: Marketplace | null
}

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

interface AdminEditMarketplaceProps extends AppProps {
  marketplace: Marketplace;
}

interface MarketplaceForm {
  domain: string;
  logo: { uri: string, type?: string, name?: string };
  banner: { uri: string, type?: string, name?: string };
  subdomain: string;
  name: string;
  description: string;
  transactionFee: number;
  creators: { address: string }[];
}

const AdminEditMarketplace = ({ marketplace }: AdminEditMarketplaceProps) => {
  const wallet = useWallet();
  const { publicKey, signTransaction } = wallet;
  const { connection } = useConnection();
  const navigate = useNavigate();
  const login = useLogin();

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
      creators: marketplace.creators.map(({ creatorAddress }) => ({ address: creatorAddress })),
      transactionFee: marketplace.auctionHouse.sellerFeeBasisPoints,
    },
  });

  const onSubmit = async ({ name, banner, logo, description, transactionFee, creators }: MarketplaceForm) => {
    if (!publicKey || !signTransaction || !wallet) {
      toast.error('Wallet not connected');

      login();

      return;
    }

    toast('Saving changes...')

    const storePubkey = await Store.getPDA(publicKey)
    const storeConfigPubkey = await StoreConfig.getPDA(storePubkey)

    const newStoreData = {
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
        owner: publicKey.toBase58(),
        auctionHouse: marketplace.auctionHouse.address,
        store: storePubkey.toBase58(),
        storeConfig: storeConfigPubkey.toBase58(),
      },
    }

    try {
      const settings = new File(
        [JSON.stringify(newStoreData)],
        'storefront_settings'
      )
      const { uri } = await ipfsSDK.uploadFile(settings);

      let auctionHouseUpdateInstruction: TransactionInstruction | undefined = undefined;

      if (
        transactionFee &&
        transactionFee != marketplace.auctionHouse.sellerFeeBasisPoints
      ) {
        auctionHouseUpdateInstruction = await updateAuctionHouse({
          wallet: wallet as Wallet,
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
      const transaction = new Transaction();

      if (auctionHouseUpdateInstruction) {
        transaction.add(auctionHouseUpdateInstruction)
      }

      transaction.add(setStorefrontV2Instructions);
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

      const signedTransaction = await signTransaction!(transaction);
      const txtId = await connection.sendRawTransaction(
        signedTransaction.serialize()
      )

      if (txtId) await connection.confirmTransaction(txtId, 'confirmed');

      toast.success(<>Marketplace updated successfully!</>, { autoClose: 5000 })
      navigate('/');

    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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
          <Controller
            control={control}
            name="banner"
            render={({
              field: { onChange, name, value },
            }) => (
              <>
                <img
                  src={value.uri}
                  alt={marketplace.name}
                  className="object-cover w-full h-80"
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
              render={({
                field: { onChange, name, value },
              }) => {
                return (
                  <>
                    <img
                      src={value.uri}
                      className="absolute border-4 border-gray-900 rounded-full w-28 h-28 -top-32"
                    />
                    <div className="absolute -top-12 left-14 transform -translate-x-1/2">
                      <UploadFile onChange={onChange} name={name} />
                    </div>
                  </>
                )
              }}
            />
          </div>
          <div className="flex">
            <div className="flex-row flex-none hidden mr-10 space-y-2 w-60 sm:block">
              <div
                className="sticky top-0 max-h-screen py-4 overflow-auto"
              >
                <ul className="flex flex-col flex-grow gap-2">
                  <li className="block bg-gray-800 p-2 rounded">
                    <Link to="/admin/marketplace/edit">Marketplace</Link>
                  </li>
                  <li className="block p-2 rounded">
                    <Link to="/admin/creators/edit">Creators</Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="grow flex flex-col items-center w-full pb-16">
              <div className="max-w-2xl w-full">
                <div className="flex items-start justify-between">
                  <h2>Edit marketplace</h2>
                  <div className="flex">
                    <Link to="/" className="button tertiary small grow-0 mr-3">
                        Cancel
                    </Link>
                    <Button
                      htmlType="submit"
                      size={ButtonSize.Small}
                      loading={isSubmitting}
                      disabled={!isDirty || isSubmitting}
                    >
                      Save changes
                    </Button>
                  </div>
                </div>
                <form className="flex flex-col max-h-screen py-4 overflow-auto">
                  <label className="text-lg mt-9">Domain</label>
                  <span className="mb-2 text-sm text-gray-300">
                    Your domain is managed by Holaplex. If you need to change it, please{' '}
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
                    This is a fee added to all sales. Funds go to the auction house wallet
                  </span>
                  <input
                    className="w-full px-3 py-2 text-gray-100 text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
                    {...register('transactionFee')}
                  />
                  {errors.transactionFee && <span>This field is required</span>}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

export default AdminEditMarketplace;