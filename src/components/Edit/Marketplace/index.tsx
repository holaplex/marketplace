import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Marketplace } from '../../../types'
import { programs, Wallet } from '@metaplex/js'
import {
  useConnection,
  useWallet,
  WalletContext,
} from '@solana/wallet-adapter-react'
import ipfsSDK from '../../../modules/ipfs/client'
import { Transaction } from '@solana/web3.js'

const {
  metaplex: { Store, SetStoreV2, StoreConfig },
} = programs
interface EditMarketplaceProps {
  marketplace: Marketplace
}

const EditMarketplace = ({ marketplace }: EditMarketplaceProps) => {
  const solana = useWallet()
  const { publicKey, connected } = solana
  const { connection } = useConnection()
  const [submitting, setSubmitting] = useState(false)
  // console.log('Solana:', solana)
  const {
    register: register,
    handleSubmit: handleSubmit,
    watch: watch,
    formState: { errors: errors },
  } = useForm()

  const onCancel = () => console.log('cancel')
  const onSubmit = async (data: any) => {
    // console.log(data)
    if (!publicKey || !solana) {
      return
    }

    setSubmitting(true)
    const storePubkey = await Store.getPDA(publicKey)
    const storeConfigPubkey = await StoreConfig.getPDA(storePubkey)

    const input = {
      meta: {
        name: data.name,
        description: data.description,
      },
      theme: {
        logo: {},
        banner: {},
      },
      creators: marketplace.creators,
      subdomain: marketplace.subdomain,
      address: {
        owner: publicKey,
        auctionHouse: marketplace.auctionHouse.address,
        store: storePubkey.toBase58(),
        storeConfig: storeConfigPubkey.toBase58(),
      },
    } as any

    const settings = new File([JSON.stringify(input)], 'storefront_settings')

    const { uri } = await ipfsSDK.uploadFile(settings)

    console.log('Settings:', settings)
    console.log('URI:', uri)

    const setStorefrontV2Instructions = new SetStoreV2(
      {
        feePayer: solana.publicKey,
      },
      {
        admin: solana.publicKey!,
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
  }

  if (!marketplace) {
    return <div></div>
  }

  return (
    <div className="grow flex flex-col pb-16">
      <div className="flex items-center justify-between">
        <h2>Edit marketplace</h2>
        <div className="flex">
          <button
            className="button tertiary small grow-0 mr-3"
            onClick={() => onCancel()}
          >
            Cancel
          </button>
          <button
            className="button small grow-0"
            onClick={handleSubmit(onSubmit)}
          >
            Save changes
          </button>
        </div>
      </div>
      <form className="flex flex-col max-h-screen py-4 overflow-auto">
        <label className="text-lg mt-9">Domain</label>
        <span className="mb-2 text-sm text-gray-300">
          Your domain is managed by Holaplex. If you need to change it, please{' '}
          <a className="underline">contact us.</a>
        </span>
        <input
          className="w-full px-3 py-2 text-gray-100 text-right text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
          defaultValue={marketplace.subdomain + '.holaplex.market'}
          {...register('domain', { disabled: true })}
        />
        {errors.marketName && <span>This field is required</span>}

        <label className="mb-2 text-lg mt-9">Market Name</label>
        <input
          className="w-full px-3 py-2 text-gray-100 text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
          defaultValue={marketplace.name}
          {...register('marketName', { required: true })}
        />
        {errors.marketName && <span>This field is required</span>}

        <label className="mb-2 text-lg mt-9">Description</label>
        <input
          className="w-full px-3 py-2 text-gray-100 text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
          defaultValue={marketplace.description}
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
  )
}
export default EditMarketplace
