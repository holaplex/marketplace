import { ENV, TokenInfo, TokenListProvider } from '@solana/spl-token-registry'
import { useEffect, useState } from 'react'

export const useTokenList = () => {
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

  return tokenMap
}
