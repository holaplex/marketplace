import { PublicKey } from '@solana/web3.js'
import cx from 'classnames'
import { always, gt, isNil, length, partialRight, pipe, when } from 'ramda'
import { addressAvatar, truncateAddress } from '../../modules/address'
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
          href={`https://holaplex.com/profiles/${activity.wallets[0].address}`}
          rel="nofollower"
          className="text-sm"
        >
          {activity.wallets[0].profile?.handle ? (
            <div className="flex items-center gap-1">
              <img
                className="rounded-full h-5 w-5 object-cover border-2 border-gray-900 "
                src={
                  when(
                    isNil,
                    always(
                      addressAvatar(new PublicKey(activity.wallets[0].address))
                    )
                  )(activity.wallets[0].profile?.profileImageUrl) as string
                }
              />
              {activity.wallets[0].profile.handle}
            </div>
          ) : (
            truncateAddress(activity.wallets[0].address)
          )}
        </a>
        {hasWallets && (
          <a
            href={`https://holaplex.com/profiles/${activity.wallets[1].address}`}
            rel="nofollower"
            className="text-sm"
          >
            {activity.wallets[1].profile?.handle ? (
              <div className="flex items-center gap-1">
                <img
                  className="rounded-full h-5 w-5 object-cover border-2 border-gray-900 "
                  src={
                    when(
                      isNil,
                      always(
                        addressAvatar(
                          new PublicKey(activity.wallets[1].address)
                        )
                      )
                    )(activity.wallets[1].profile?.profileImageUrl) as string
                  }
                />
                {activity.wallets[1].profile.handle}
              </div>
            ) : (
              truncateAddress(activity.wallets[1].address)
            )}
          </a>
        )}
      </div>
    </div>
  )
}

export default ActivityWallets
