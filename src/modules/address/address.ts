import { pipe, split, take, join, takeLast } from 'ramda'

export const truncateAddress = pipe(
  split(''),
  (characters: string[]): string[] => [
    pipe(take(4), join(''))(characters),
    pipe(takeLast(4), join(''))(characters),
  ],
  join('...')
)

export const collectionNameByAddress = function (address: string): string {
  switch (address) {
    case 'Bhr9iWx7vAZ4JDD5DVSdHxQLqG9RvCLCSXvu6yC4TF6c':
      return 'Skeleton Crew'
    case '3wzFmJEHT3pfFukQPi9T73NCLb52qyvaKgEztumtTCJU':
      return 'Zen0verse'
    case '9QyeH5pmnNEWqnHzNtoeDFn8QVwVgvdvuNKu6TfHiJgg':
      return 'Longharbor'
    case '2QkXNKFB64x2vezfw5XLdWqhSwGr83Gs6MWD2gqfDcpE':
      return 'Cursed Mikes'
    case '3oPa5K78fGusBgd2LtPE65e7AZuADJPadqrtqgWxmKLA':
      return 'DARKELV'
  }
  return truncateAddress(address)
}

export const collectionDescriptionByAddress = function (
  address: string
): string {
  switch (address) {
    case 'Bhr9iWx7vAZ4JDD5DVSdHxQLqG9RvCLCSXvu6yC4TF6c':
      return '6,666 hand-drawn SKULLS that unlock access to whitelists for private independent artist launches and a thriving DAO funded via web3 products like Treat Toolbox.'
    case '3wzFmJEHT3pfFukQPi9T73NCLb52qyvaKgEztumtTCJU':
      return 'Low supply art collection of 777 procedurally generated pixel places by artist @zen0m'
    case '9QyeH5pmnNEWqnHzNtoeDFn8QVwVgvdvuNKu6TfHiJgg':
      return "200 1/1 panels from Alejandro Mirabal's self-published comic Longharbor. Hodlers get access to his generative collection in 2022 & a digital copy of the comic."
    case '2QkXNKFB64x2vezfw5XLdWqhSwGr83Gs6MWD2gqfDcpE':
      return 'Cursed Mikes is a set of 1500 generated PFPs from Alejandro Mirabal.'
    case '3oPa5K78fGusBgd2LtPE65e7AZuADJPadqrtqgWxmKLA':
      return 'Darkelv is created by @marsdorian. He is a full-time illustrator born with a heart valve insufficiency in Berlin, creating artworks about imperfect but passionate people.'
  }
  return truncateAddress(address)
}

export const moonrankJSONByAddress = function (
  address: string
): { [index: string]: number } | null {
  switch (address) {
    case 'Bhr9iWx7vAZ4JDD5DVSdHxQLqG9RvCLCSXvu6yC4TF6c':
      return require('../../rankings/moonrank_skulls.json')
    case '3wzFmJEHT3pfFukQPi9T73NCLb52qyvaKgEztumtTCJU':
      return require('../../rankings/moonrank_zen0verse.json')
    case '2QkXNKFB64x2vezfw5XLdWqhSwGr83Gs6MWD2gqfDcpE':
      return require('../../rankings/moonrank_cursedmikes.json')
    case '3oPa5K78fGusBgd2LtPE65e7AZuADJPadqrtqgWxmKLA':
      return require('../../rankings/moonrank_darkelv.json')
  }
  return null
}

export const howrareisJSONByAddress = function (
  address: string
): { [index: string]: number } | null {
  switch (address) {
    case 'Bhr9iWx7vAZ4JDD5DVSdHxQLqG9RvCLCSXvu6yC4TF6c':
      return require('../../rankings/howrareis_skulls.json')
    case '2QkXNKFB64x2vezfw5XLdWqhSwGr83Gs6MWD2gqfDcpE':
      return require('../../rankings/howrareis_cursedmikes.json')
  }
  return null
}
