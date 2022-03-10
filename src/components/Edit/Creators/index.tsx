import { map, prop } from 'ramda'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Marketplace } from '../../../types'
import Creator from '../../Creator'

interface EditCreatorsProps {
  marketplace: Marketplace
}

const EditCreators = ({ marketplace }: EditCreatorsProps) => {
  const [addCreator, setAddCreator] = useState(false)
  const creators = map(prop('creatorAddress'))(marketplace.creators)
  const {
    register: register,
    handleSubmit: handleSubmit,
    watch: watch,
    formState: { errors: errors },
  } = useForm()

  if (!marketplace) {
    return <div></div>
  }

  return (
    <div className="grow flex flex-col pb-16">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2>Creators</h2>
          <text className="mb-2 text-sm text-gray-300">
            Manage the creators whose work will be available on your
            marketplace.
          </text>
        </div>
        <div className="flex">
          {addCreator && (
            <button
              className="button tertiary small grow-0 mr-3"
              onClick={() => setAddCreator(false)}
            >
              Cancel
            </button>
          )}
          {!addCreator && (
            <button
              className="button small grow-0"
              onClick={() => setAddCreator(true)}
            >
              Add creator
            </button>
          )}
        </div>
      </div>
      {addCreator && (
        <form className="flex flex-col max-h-screen py-4 overflow-auto">
          <label className="mb-2 text-lg mt-9">
            Add creator by wallet address
          </label>
          <input
            className="w-full px-3 py-2 text-gray-100 text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
            placeholder="SOL wallet address..."
            {...register('walletAddress', { required: true })}
          />
        </form>
      )}

      <ul className="flex flex-col flex-grow mb-6 mt-6">
        {creators.map((creator) => (
          <li key={creator}>
            <Creator address={creator} showRemove={true} />
          </li>
        ))}
      </ul>
    </div>
  )
}
export default EditCreators
