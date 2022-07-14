import { ENV, TokenInfo, TokenListProvider } from '@solana/spl-token-registry'
import { useEffect, useState } from 'react'

type TokenMap = Map<string, TokenInfo>

export const useTokenList = (): [TokenMap, boolean] => {
  const [tokenMap, setTokenMap] = useState<TokenMap>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    new TokenListProvider().resolve().then((tokens) => {
      const tokenList = tokens.filterByChainId(ENV.MainnetBeta).getList()

      setTokenMap(
        tokenList.reduce((map, item) => {
          map.set(item.address, item)
          return map
        }, new Map())
      )
      setLoading(false)
    })
  }, [setTokenMap])

  return [tokenMap, loading]
}
