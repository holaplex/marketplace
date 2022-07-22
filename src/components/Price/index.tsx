import { isSol } from 'src/modules/sol'
import cx from 'classnames'
import { TokenInfo } from '@solana/spl-token-registry'
import { MarketplaceClient } from '@holaplex/marketplace-js-sdk'

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
          {MarketplaceClient.price(price, token)}
        </span>
        {!isSol(token.address) && (
          <span className="text-sm mb-1">{token.symbol}</span>
        )}
      </div>
    ) : (
      <span className={style}>{price}</span>
    )}
  </>
)

export default Price
