import { useForm } from 'react-hook-form'
import { Marketplace } from '../../../types'
import { useWallet } from '@solana/wallet-adapter-react'

interface EditMarketplaceProps {
  marketplace: Marketplace
  onUpdateClicked: (form: EditMarketplaceForm) => void
}

export interface EditMarketplaceForm {
  marketName: string
  description: string
  transactionFee: string
}

const EditMarketplace = ({
  marketplace,
  onUpdateClicked,
}: EditMarketplaceProps) => {
  const {
    register: register,
    handleSubmit: handleSubmit,
    watch: watch,
    formState: { errors: errors },
  } = useForm()

  const onCancel = () => console.log('cancel')
  const onSubmit = async (data: any) => {
    // console.log(data)
    const form = {
      marketName: data.marketName,
      description: data.description,
      transactionFee: data.transactionFee,
    }
    onUpdateClicked(form)
  }

  if (!marketplace) {
    return <div></div>
  }

  return (
    <div className="grow flex flex-col pb-16 max-w-xl">
      <div className="flex items-start justify-between">
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
        {errors.domain && <span>This field is required</span>}

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
