import { TokenInfo } from '@solana/spl-token-registry'
import React from 'react'
import { truncateAddress } from './../../modules/address'

export const SplToken = ({
  tokenInfo,
  mintAddress,
  loading,
}: {
  tokenInfo: TokenInfo | undefined
  mintAddress: string
  loading?: boolean
}) => {
  if (loading) {
    return <SplToken.Skeleton />
  }

  if (!tokenInfo) {
    return (
      <span className="text-gray-100 text-sm">
        {truncateAddress(mintAddress)}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <img src={tokenInfo.logoURI} className="h-8 w-8 rounded-full" />
      <div className="flex flex-col gap-1">
        <span className="text-gray-100 text-sm">{tokenInfo.name}</span>
        <span className="text-gray-300 text-xs">{tokenInfo.symbol}</span>
      </div>
    </div>
  )
}

SplToken.Skeleton = function SplTokenSkeleton(): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-gray-800" />
      <div className="flex flex-col gap-1">
        <span className="text-gray-100 text-sm bg-gray-800 h-6 w-24" />
        <span className="text-gray-300 text-xs bg-gray-800 h-4 w-6" />
      </div>
    </div>
  )
}
