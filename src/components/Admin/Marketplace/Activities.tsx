import { map, prop } from 'ramda'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Marketplace } from '../../../types'
import Creator, { RemoveCreatorForm } from '../../Creator'

interface ActivitiesProps {
  marketplace: Marketplace
  setShowEditMarketplace: (show: boolean) => void
}

const Activities = ({
  marketplace,
  setShowEditMarketplace,
}: ActivitiesProps) => {
  if (!marketplace) {
    return <div></div>
  }

  return (
    <div className="grow flex flex-col pb-16 max-w-2xl">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h2>{marketplace.name}</h2>
        </div>
        <div className="flex">
          <button
            className="button small grow-0"
            onClick={() => setShowEditMarketplace(true)}
          >
            Edit Marketplace
          </button>
        </div>
      </div>

      <div className="flex mt-12">
        <div className="flex-1">
          <div className="label">FLOOR PRICE</div>
          <p className="text-base md:text-xl lg:text-3xl">
            <b className="sol-amount">__</b>
          </p>
        </div>
        <div className="flex-1">
          <div className="label">AVG PRICE</div>
          <p className="text-base md:text-xl lg:text-3xl">
            <b className="sol-amount">__</b>
          </p>
        </div>
        <div className="flex-1">
          <div className="label">VOL LAST 24h</div>
          <p className="text-base md:text-xl lg:text-3xl">
            <b className="sol-amount">__</b>
          </p>
        </div>
        <div className="flex-1">
          <div className="label">VOL ALL TIME</div>
          <p className="text-base md:text-xl lg:text-3xl">
            <b className="sol-amount">__</b>
          </p>
        </div>
      </div>
      <h3 className="mt-12">Activity</h3>
      <section className="w-full mt-10 mb-10">
        <header className="grid grid-cols-4 px-4 mb-2">
          <span className="label">EVENT</span>
          <span className="label">WALLETS</span>
          <span className="label">PRICE</span>
          <span className="label">WHEN</span>
        </header>
      </section>
    </div>
  )
}
export default Activities
