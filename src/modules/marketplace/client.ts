import { WalletContextState } from '@solana/wallet-adapter-react'
import {
  TransactionInstruction,
  Connection,
  PublicKey,
  Transaction,
  PublicKeyInitData,
  TransactionInstructionCtorFields,
} from '@solana/web3.js'
import { programs, Wallet } from '@metaplex/js'
import { updateAuctionHouse } from './../auction-house'
import ipfsSDK from './../ipfs/client'
import { NATIVE_MINT } from '@solana/spl-token'
import { AuctionHouseProgram } from '@holaplex/mpl-auction-house'
import { createCreateAuctionHouseInstruction } from '@holaplex/mpl-auction-house/dist/src/generated/instructions'

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

interface MarketplaceAuctionHousePayload {
  address: string
}

interface MarketplaceAddressPayload {
  owner?: string
  /** @deprecated: Instead use auctionHouses in Settings Payload */
  auctionHouse?: string
  store?: string
  storeConfig?: string
}
interface MarktplaceSettingsPayload {
  meta: MarktetplaceMetaPayload
  theme: MarketplaceThemePayload
  creators: MarketplaceCreatorPayload[]
  subdomain: string
  auctionHouses: MarketplaceAuctionHousePayload[]
  address?: MarketplaceAddressPayload
}

interface MarketplaceClientParams {
  connection: Connection
  wallet: WalletContextState
}

interface CreateAuctionHouseParams {
  wallet: Wallet
  sellerFeeBasisPoints: number
  canChangeSalePrice?: boolean
  requiresSignOff?: boolean
  treasuryWithdrawalDestination?: PublicKeyInitData
  feeWithdrawalDestination?: PublicKeyInitData
  treasuryMint?: PublicKeyInitData
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

  async createAuctionHouses(
    tokens: { address: string }[],
    sellerFeeBasisPoints: number
  ): Promise<{ address: string }[]> {
    const wallet = this.wallet as Wallet
    const publicKey = wallet.publicKey as PublicKey
    const connection = this.connection

    const auctionHouses: { address: string }[] = []
    const instructions: TransactionInstruction[] = []

    tokens.forEach(async (token) => {
      const canChangeSalePrice = false
      const requiresSignOff = false
      const treasuryWithdrawalDestination = undefined
      const feeWithdrawalDestination = undefined
      const treasuryMint = token.address

      const twdKey = treasuryWithdrawalDestination
        ? new PublicKey(treasuryWithdrawalDestination)
        : wallet.publicKey

      const fwdKey = feeWithdrawalDestination
        ? new PublicKey(feeWithdrawalDestination)
        : wallet.publicKey

      const tMintKey = treasuryMint ? new PublicKey(treasuryMint) : NATIVE_MINT

      const twdAta = tMintKey.equals(NATIVE_MINT)
        ? twdKey
        : (
            await AuctionHouseProgram.findAssociatedTokenAccountAddress(
              tMintKey,
              twdKey
            )
          )[0]

      const [auctionHouse, bump] =
        await AuctionHouseProgram.findAuctionHouseAddress(
          wallet.publicKey,
          tMintKey
        )

      auctionHouses.push({ address: auctionHouse.toBase58() })

      const [feeAccount, feePayerBump] =
        await AuctionHouseProgram.findAuctionHouseFeeAddress(auctionHouse)

      const [treasuryAccount, treasuryBump] =
        await AuctionHouseProgram.findAuctionHouseTreasuryAddress(auctionHouse)

      const auctionHouseCreateInstruction = createCreateAuctionHouseInstruction(
        {
          treasuryMint: tMintKey,
          payer: wallet.publicKey,
          authority: wallet.publicKey,
          feeWithdrawalDestination: fwdKey,
          treasuryWithdrawalDestination: twdAta,
          treasuryWithdrawalDestinationOwner: twdKey,
          auctionHouse,
          auctionHouseFeeAccount: feeAccount,
          auctionHouseTreasury: treasuryAccount,
        },
        {
          bump,
          feePayerBump,
          treasuryBump,
          sellerFeeBasisPoints,
          requiresSignOff,
          canChangeSalePrice,
        }
      )
      instructions.push(auctionHouseCreateInstruction)
    })

    const transaction = new Transaction()

    instructions.forEach((instruction: TransactionInstruction) => {
      transaction.add(instruction)
    })

    transaction.feePayer = publicKey
    transaction.recentBlockhash = (
      await connection.getRecentBlockhash()
    ).blockhash

    const signedTransaction = await this.wallet.signTransaction!(transaction)
    const txtId = await connection.sendRawTransaction(
      signedTransaction.serialize()
    )

    if (txtId) await connection.confirmTransaction(txtId, 'confirmed')

    return auctionHouses
  }
}

export const initMarketplaceSDK = (
  connection: Connection,
  wallet: WalletContextState
): MarketplaceClient => {
  return new MarketplaceClient({ connection, wallet })
}
