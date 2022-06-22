import { TokenInfo } from '@solana/spl-token-registry'

export const getPriceWithMantissa = (
  price: number,
  mintInfo: TokenInfo
): number => {
  const mantissa = 10 ** mintInfo.decimals
  return Math.ceil(price * mantissa)
}

export const getPrice = (
  priceInUnits: number,
  mintInfo: TokenInfo,
  precision: number = 5
) => {
  var multiplier = Math.pow(10, precision)
  const mantissa = 10 ** mintInfo.decimals
  return Math.round((priceInUnits / mantissa) * multiplier) / multiplier
}
