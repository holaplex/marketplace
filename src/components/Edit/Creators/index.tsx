import { map, prop } from 'ramda'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Marketplace } from '../../../types'
import Creator, { RemoveCreatorForm } from '../../Creator'

interface EditCreatorsProps {
  marketplace: Marketplace
  onAddCreatorClicked: (form: AddCreatorForm) => void
  onRemoveCreatorClicked: (form: RemoveCreatorForm) => void
}

export interface AddCreatorForm {
  walletAddress: string
}

const EditCreators = ({
  marketplace,
  onAddCreatorClicked,
  onRemoveCreatorClicked,
}: EditCreatorsProps) => {
  const [showAddCreator, setShowAddCreator] = useState(false)
  const [creatorField, setCreatorField] = useState('')
  const creators = map(prop('creatorAddress'))(marketplace.creators)
  const enterPressed = (v: any) => {
    if (!v) return
    console.log(v)
    setCreatorField('')
    onAddCreatorClicked({ walletAddress: v })
  }

  if (!marketplace) {
    return <div></div>
  }

  return (
    <div className="grow flex flex-col pb-16 max-w-xl">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h2>Creators</h2>
          <text className="mb-2 text-sm text-gray-300">
            Manage the creators whose work will be available on your
            marketplace.
          </text>
        </div>
        <div className="flex">
          {showAddCreator && (
            <button
              className="button tertiary small grow-0 mr-3"
              onClick={() => setShowAddCreator(false)}
            >
              Cancel
            </button>
          )}
          {!showAddCreator && (
            <button
              className="button small grow-0"
              onClick={() => setShowAddCreator(true)}
            >
              Add creator
            </button>
          )}
        </div>
      </div>
      {showAddCreator && (
        <div className="flex flex-col max-h-screen py-4 overflow-auto">
          <label className="mb-2 text-lg mt-9">
            Add creator by wallet address
          </label>
          <input
            className="w-full px-3 py-2 text-gray-100 text-base border border-gray-700 focus:outline-none bg-gray-900 rounded-sm"
            placeholder="SOL wallet address..."
            value={creatorField}
            onChange={(v) => {
              setCreatorField(v.target.value)
            }}
            onKeyPress={(e) =>
              e.key === 'Enter' && enterPressed(e.target.value)
            }
          />
        </div>
      )}

      <ul className="flex flex-col flex-grow mb-6 mt-6">
        {creators.map((creator) => (
          <li key={creator}>
            <Creator
              address={creator}
              showRemove={true}
              onRemoveClicked={onRemoveCreatorClicked}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
export default EditCreators
