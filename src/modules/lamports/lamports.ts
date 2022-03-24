import { LAMPORTS_PER_SOL } from '@solana/web3.js'

export const toSOL = (lamports: number, precision: number = 3) => {
  var multiplier = Math.pow(10, precision)

  return Math.round((lamports / LAMPORTS_PER_SOL) * multiplier) / multiplier
}
