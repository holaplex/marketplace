import React from 'react'
import { useTokenList } from 'src/hooks/tokenList'

export const SplToken = (props: { mint: string }) => {
  const tokenMap = useTokenList()

  const token = tokenMap.get(props.mint)
  if (!token)
    return (
      <span className="text-gray-100 text-sm">truncateAddress(props.mint)</span>
    )

  return (
    <div className="flex items-center gap-3">
      <img src={token.logoURI} className="h-8 w-8" />
      <div className="flex flex-col gap-1">
        <span className="text-gray-100 text-sm">{token.name}</span>
        <span className="text-gray-300 text-xs">{token.symbol}</span>
      </div>
    </div>
  )
}
