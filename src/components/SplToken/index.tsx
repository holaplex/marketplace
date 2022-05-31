import React, { useEffect, useState } from 'react'
import { TokenListProvider, TokenInfo, ENV } from '@solana/spl-token-registry'

export const SplToken = (props: { mint: string }) => {
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map())

  useEffect(() => {
    new TokenListProvider().resolve().then((tokens) => {
      const tokenList = tokens.filterByChainId(ENV.MainnetBeta).getList()

      setTokenMap(
        tokenList.reduce((map, item) => {
          map.set(item.address, item)
          return map
        }, new Map())
      )
    })
  }, [setTokenMap])

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
