import '../styles/globals.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/200.css'
import '@fontsource/material-icons'
import type { AppProps } from 'next/app'
import { ApolloProvider } from '@apollo/client'
import client from '../client'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider client={client}>
      <div className="app-wrapper">
        <Component {...pageProps} />
      </div>
    </ApolloProvider>
  )
}

export default MyApp
