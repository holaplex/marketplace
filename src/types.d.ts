import BN from 'bn.js'

export type Volume = number

interface MarketplaceStats {
  nfts: Volume
}

interface CreatorCounts {
  creations: number
}
export interface UserWallet {
  address: string
  profile: TwitterProfile
}

export interface Marketplace {
  subdomain: string
  name: string
  description: string
  logoUrl: string
  bannerUrl: string
  auctionHouse: AuctionHouse
  ownerAddress: string
  creators: MarketplaceCreator[]
  stats: MarketplaceStats
}

interface GraphQLObject {
  __typename: string
}

export interface MarketplaceCreator {
  creatorAddress: string
  storeConfigAddress: string
  preview: Nft[]
}

export interface AuctionHouse {
  address: string
  treasuryMint: string
  auctionHouseTreasury: string
  treasuryWithdrawalDestination: string
  feeWithdrawalDestination: string
  authority: string
  creator: string
  auctionHouseFeeAccount: string
  bump: number
  treasuryBump: number
  feePayerBump: number
  sellerFeeBasisPoints: number
  requiresSignOff: boolean
  canChangeSalePrice: boolean
  stats?: MintStats
}

export interface AttributeVariant {
  name: string
  count: number
}

export interface AttributeGroup {
  name: string
  variants: AttributeVariant[]
}

export interface MintStats {
  volume24hr: BN
  average: BN
  floor: BN
  mint: string
  auctionHouse: string
}
export interface Creator extends UserWallet {
  attributeGroups: AttributeGroup[]
  stats: MintStats[]
  counts: CreatorCounts
}

export interface NftAttribute {
  value: string
  traitType: string
}

export interface NftOwner extends UserWallet {
  associatedTokenAccountAddress: string
  twitterHandle: string
}

export interface NftCreator extends UserWallet {
  twitterHandle: string
  metadataAddress: string
  share: number
  verified: boolean
  position: number
}

interface AddressKeyType {
  [address: string]: string
}

export type KeyType = AddressKeyType

export interface Listing {
  address: string
  auctionHouse: string
  bookkepper: string
  seller: string
  metadata: string
  purchaseReceipt: string
  price: BN
  tokenSize: number
  bump: number
  tradeState: string
  tradeStateBump: number
  createdAt: string
  canceledAt: string
}

export interface Purchase {
  address: string
  buyer: string
  seller: string
  auctionHouse: string
  price: BN
  createdAt: string
}

export interface Offer {
  address: string
  buyer: string
  price: BN
  createdAt: string
  auctionHouse: string
  tradeState: string
}

export interface Nft extends KeyType {
  name: string
  address: string
  description: string
  image: string
  sellerFeeBasisPoints: number
  mintAddress: string
  primarySaleHappened: boolean
  attributes: NftAttribute[]
  creators: NftCreator[]
  owner: NftOwner
  listings: Listing[]
  purchases: Purchase[]
  offers: Offer[]
  activities: Activity[]
}

export interface AttributeFilter {
  traitType: string
  values: string[]
}

export enum PresetNftFilter {
  All = 'All',
  Listed = 'Listed',
  Owned = 'Owned',
  OpenOffers = 'OpenOffers',
}

export interface Viewer extends GraphQLObject {
  id: string
  balance: number
}

export enum PresetEditFilter {
  Marketplace = 'Marketplace',
  Creators = 'Creators',
}

export enum ActivityType {
  Listed = 'listing',
  Sold = 'purchase',
}
export interface Activity {
  address: string
  metadata: string
  auctionHouse: string
  price: BN
  createdAt: string
  wallets: string[]
  activityType: string
}

export interface NftCount {
  total: number
  listed: number
}

export interface Wallet extends UserWallet {
  nftCounts: WalletNftCount
  connectionCounts: ConnectionCounts
}

export interface TwitterProfile {
  handle: string
  profileImageUrl: string
  bannerImageUrl: string
  description: string
}

export interface WalletNftCount {
  owned: number
  offered: number
  listed: number
}

export interface ConnectionCounts {
  fromCount: number
  toCount: number
}
