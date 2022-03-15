import { programs } from '@metaplex/js'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { Marketplace } from 'src/types'
import { NewData } from './types'

const {
  metaplex: { Store, StoreConfig },
} = programs

export const getInputData = async (
  data: NewData,
  marketplaceData: Marketplace,
  solana: WalletContextState
) => {
  const { publicKey } = solana

  if (!solana || !publicKey) {
    return
  }

  const storePubkey = await Store.getPDA(publicKey)
  const storeConfigPubkey = await StoreConfig.getPDA(storePubkey)

  const input = {
    meta: {
      name: data.name,
      description: data.description,
    },
    theme: {
      logo: {
        url: data.logo,
      },
      banner: { url: data.banner },
    },
    creators: data.creators,
    subdomain: marketplaceData.subdomain,
    address: {
      owner: publicKey,
      auctionHouse: marketplaceData.auctionHouse.address,
      store: storePubkey.toBase58(),
      storeConfig: storeConfigPubkey.toBase58(),
    },
  } as any
  return input
}
