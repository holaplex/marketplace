import { WalletContextState } from '@solana/wallet-adapter-react'
import {
  TransactionInstruction,
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js'
import { programs, Wallet } from '@metaplex/js'
import { updateAuctionHouse } from './../auction-house'
import ipfsSDK from './../ipfs/client'

const {
  metaplex: { Store, SetStoreV2, StoreConfig },
} = programs

interface MarktetplaceMetaPayload {
  name: string
  description: string
}

interface FileUploadPayload {
  name: string | undefined
  type: string | undefined
  url: string
}

interface MarketplaceThemePayload {
  logo: FileUploadPayload
  banner: FileUploadPayload
}

interface MarketplaceCreatorPayload {
  address: string
}

interface MarketplaceAddressPayload {
  owner?: string
  auctionHouse: string
  store?: string
  storeConfig?: string
}
interface MarktplaceSettingsPayload {
  meta: MarktetplaceMetaPayload
  theme: MarketplaceThemePayload
  creators: MarketplaceCreatorPayload[]
  subdomain: string
  address: MarketplaceAddressPayload
}

interface MarketplaceClientParams {
  connection: Connection
  wallet: WalletContextState
}

class MarketplaceClient {
  private connection: Connection
  private wallet: WalletContextState

  constructor({ connection, wallet }: MarketplaceClientParams) {
    this.connection = connection
    this.wallet = wallet
  }

  async update(
    settings: MarktplaceSettingsPayload,
    transactionFee: number
  ): Promise<void> {
    const wallet = this.wallet
    const publicKey = wallet.publicKey as PublicKey
    const connection = this.connection

    const storePubkey = await Store.getPDA(publicKey)
    const storeConfigPubkey = await StoreConfig.getPDA(storePubkey)

    settings.address.store = storePubkey.toBase58()
    settings.address.storeConfig = storeConfigPubkey.toBase58()
    settings.address.owner = publicKey.toBase58()

    const storefrontSettings = new File(
      [JSON.stringify(settings)],
      'storefront_settings'
    )
    const { uri } = await ipfsSDK.uploadFile(storefrontSettings)

    const auctionHouseUpdateInstruction = await updateAuctionHouse({
      wallet: wallet as Wallet,
      sellerFeeBasisPoints: transactionFee,
    })

    const setStorefrontV2Instructions = new SetStoreV2(
      {
        feePayer: publicKey,
      },
      {
        admin: publicKey,
        store: storePubkey,
        config: storeConfigPubkey,
        isPublic: false,
        settingsUri: uri,
      }
    )
    const transaction = new Transaction()

    if (auctionHouseUpdateInstruction) {
      transaction.add(auctionHouseUpdateInstruction)
    }

    transaction.add(setStorefrontV2Instructions)
    transaction.feePayer = publicKey
    transaction.recentBlockhash = (
      await connection.getRecentBlockhash()
    ).blockhash

    const signedTransaction = await wallet.signTransaction!(transaction)
    const txtId = await connection.sendRawTransaction(
      signedTransaction.serialize()
    )

    if (txtId) await connection.confirmTransaction(txtId, 'confirmed')
  }
}

export const initMarketplaceSDK = (
  connection: Connection,
  wallet: WalletContextState
): MarketplaceClient => {
  return new MarketplaceClient({ connection, wallet })
}
