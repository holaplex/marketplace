import { TokenInfo } from '@solana/spl-token-registry'
import React from 'react'

export const SplToken = ({
  tokenInfo,
  mintAddress,
}: {
  tokenInfo: TokenInfo | undefined
  mintAddress: string
}) => {
  if (!tokenInfo) {
    return (
      <span className="text-gray-100 text-sm">
        truncateAddress({mintAddress})
      </span>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <img src={tokenInfo.logoURI} className="h-8 w-8" />
      <div className="flex flex-col gap-1">
        <span className="text-gray-100 text-sm">{tokenInfo.name}</span>
        <span className="text-gray-300 text-xs">{tokenInfo.symbol}</span>
      </div>
    </div>
  )
}
