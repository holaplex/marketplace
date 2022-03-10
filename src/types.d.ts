export interface Marketplace {
  subdomain: string
  name: string
  description: string
  logoUrl: string
  bannerUrl: string
  auctionHouse: AuctionHouse
  ownerAddress: string
  creators: MarketplaceCreator[]
}

interface GraphQLObject {
  __typename: string
}

export interface MarketplaceCreator {
  creatorAddress: string
  storeConfigAddress: string
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
}

export interface AttributeVariant {
  name: string
  count: number
}

export interface AttributeGroup {
  name: string
  variants: AttributeVariant[]
}

export interface Creator {
  addresss: string
  attributeGroups: AttributeGroup[]
}

export interface NftAttribute {
  value: string
  traitType: string
}

export interface UserWallet {
  address: string
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
  price: number
  tokenSize: number
  bump: number
  tradeState: string
  tradeStateBump: number
  createdAt: string
  canceledAt: string
}

export interface Offer {
  address: string
  buyer: string
  price: number
  createdAt: string
  auctionHouse: string
}

export interface Nft extends KeyType {
  name: string
  address: string
  description: string
  image: string
  sellerFeeBasisPoints: number
  mintAddress: string
  attributes: NftAttribute[]
  creators: UserWallet[]
  owner: UserWallet
  listings: Listing[]
  offers: Offer[]
}

export interface AttributeFilter {
  traitType: string
  values: string[]
}

export enum PresetNftFilter {
  All = 'All',
  Listed = 'Listed',
  Owned = 'Owned',
}

export interface Viewer extends GraphQLObject {
  id: string
  balance: number
}

export enum PresetEditFilter {
  Marketplace = 'Marketplace',
  Creators = 'Creators',
}
