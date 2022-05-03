import cx from 'classnames'
import { gt, length, partialRight, pipe } from 'ramda'
import { truncateAddress } from '../../modules/address'
import { Activity } from '../../types'

interface Props {
  activity: Activity
}
const moreThanOne = pipe(length, partialRight(gt, [1]))

const ActivityWallets = ({ activity }: Props) => {
  const hasWallets = moreThanOne(activity.wallets)

  return (
    <div
      className={cx('flex items-center self-center ', {
        '-ml-6': hasWallets,
      })}
    >
      {hasWallets && (
        <img
          src="/images/uturn.svg"
          className="mr-2 text-gray-300 w-4"
          alt="wallets"
        />
      )}
      <div className="flex flex-col">
        <a
          href={`https://holaplex.com/profiles/${activity.wallets[0]}`}
          rel="nofollower"
          className="text-sm"
        >
          {truncateAddress(activity.wallets[0])}
        </a>
        {hasWallets && (
          <a
            href={`https://holaplex.com/profiles/${activity.wallets[1]}`}
            rel="nofollower"
            className="text-sm"
          >
            {truncateAddress(activity.wallets[1])}
          </a>
        )}
      </div>
    </div>
  )
}

export default ActivityWallets
