import { PublicKey } from '@solana/web3.js'
import { pipe, split, take, join, takeLast, add } from 'ramda'

export const truncateAddress = pipe(
  split(''),
  (characters: string[]): string[] => [
    pipe(take(4), join(''))(characters),
    pipe(takeLast(4), join(''))(characters),
  ],
  join('...')
)

export const addressAvatar = (publicKey: PublicKey) => {
  const gradient = publicKey.toBytes().reduce(add, 0) % 8
  return `https://market.holaplex.com/images/gradients/gradient-${
    gradient + 1
  }.png`
}
