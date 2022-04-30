import { PublicKey } from '@solana/web3.js'
import { pipe, split, take, join, takeLast, add } from 'ramda'
import { ADDRESSES } from '../../utils/utilities'

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
  return `https://holaplex.com/images/gradients/gradient-${gradient + 1}.png`
}

export const collectionNameByAddress = function (address: string): string {
  switch (address) {
    case ADDRESSES.SKELETON_CREW:
      return 'Skeleton Crew'
    case ADDRESSES.ZEN0VERSE:
      return 'Zen0verse'
    case ADDRESSES.LONGHARBOR:
      return 'Longharbor'
    case ADDRESSES.CURSED_MIKES:
      return 'Cursed Mikes'
    case ADDRESSES.DARKELV:
      return 'DARKELV'
  }
  return truncateAddress(address)
}

export const collectionDescriptionByAddress = function (
  address: string
): string {
  switch (address) {
    case ADDRESSES.SKELETON_CREW:
      return '6,666 hand-drawn SKULLS that unlock access to whitelists for private independent artist launches and a thriving DAO funded via web3 products like Treat Toolbox.'
    case ADDRESSES.ZEN0VERSE:
      return 'Low supply art collection of 777 procedurally generated pixel places by artist @zen0m'
    case ADDRESSES.LONGHARBOR:
      return "200 1/1 panels from Alejandro Mirabal's self-published comic Longharbor. Hodlers get access to his generative collection in 2022 & a digital copy of the comic."
    case ADDRESSES.CURSED_MIKES:
      return 'Cursed Mikes is a set of 1500 generated PFPs from Alejandro Mirabal.'
    case ADDRESSES.DARKELV:
      return 'Darkelv is created by @marsdorian. He is a full-time illustrator born with a heart valve insufficiency in Berlin, creating artworks about imperfect but passionate people.'
  }
  return truncateAddress(address)
}

export const moonrankJSONByAddress = function (
  address: string
): { [index: string]: number } | null {
  switch (address) {
    case ADDRESSES.SKELETON_CREW:
      return require('../../rankings/moonrank_skulls.json')
    case ADDRESSES.ZEN0VERSE:
      return require('../../rankings/moonrank_zen0verse.json')
    case ADDRESSES.CURSED_MIKES:
      return require('../../rankings/moonrank_cursedmikes.json')
    case ADDRESSES.DARKELV:
      return require('../../rankings/moonrank_darkelv.json')
  }
  return null
}

export const howrareisJSONByAddress = function (
  address: string
): { [index: string]: number } | null {
  switch (address) {
    case ADDRESSES.SKELETON_CREW:
      return require('../../rankings/howrareis_skulls.json')
    case ADDRESSES.CURSED_MIKES:
      return require('../../rankings/howrareis_cursedmikes.json')
  }
  return null
}
