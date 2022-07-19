import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { equals } from 'ramda'

export const toSOL = (lamports: number, precision: number = 5) => {
  var multiplier = Math.pow(10, precision)

  return Math.round((lamports / LAMPORTS_PER_SOL) * multiplier) / multiplier
}

export const NATIVE_MINT_ADDRESS = 'So11111111111111111111111111111111111111112'

export const isSol = equals(NATIVE_MINT_ADDRESS)
