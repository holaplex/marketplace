export interface Marketplace {
  subdomain: string;
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  auctionHouse: AuctionHouse;
  ownerAddress: string;
}

export interface AuctionHouse {
  address: string;
  treasuryMint: string;
  auctionHouseTreasury: string;
  treasuryWithdrawalDestination: string;
  feeWithdrawalDestination: string;
  authority: string;
  creator: string;
  auction_houseFeeAccount: string;
  bump: number;
  treasuryBump: number;
  feePayerBump: number;
  sellerFeeBasisPoints: number;
  requireSignOff: boolean;
  canChangeSalePrice: boolean;
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

export interface NftOwner {
  address: string
}

export interface Nft {
  name: string
  address: string
  description: string
  image: string
  sellerFeeBasisPoints: number
  mintAddress: string
  attributes: NftAttribute[]
  owner: NftOwner
}
