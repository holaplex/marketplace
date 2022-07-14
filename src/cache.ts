import { makeVar } from '@apollo/client'
import { Viewer } from '@holaplex/marketplace-js-sdk'

export const viewerVar = makeVar<Viewer | null>(null)

export const sidebarOpenVar = makeVar<boolean>(false)
