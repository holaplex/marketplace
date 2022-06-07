import { isSol, toSOL } from 'src/modules/sol'
import cx from 'classnames'
import { TokenInfo } from '@solana/spl-token-registry'

interface PriceProps {
  price: number
  token?: TokenInfo
  style?: string
}

const Price = ({ price, token, style }: PriceProps) => (
  <>
    {token ? (
      <div className="flex items-end gap-2">
        <span
          className={cx(style, {
            'sol-amount': isSol(token.address),
          })}
        >
          {isSol(token.address) ? toSOL(price) : price}
        </span>
        {!isSol(token.address) && (
          <span className="text-sm">{token.symbol}</span>
        )}
      </div>
    ) : (
      <span className={style}>{price}</span>
    )}
  </>
)

export default Price
