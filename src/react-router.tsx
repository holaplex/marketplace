import React from 'react'
import { BrowserRouter } from 'react-router-dom'
const isServer = typeof window === 'undefined'

const withReactRouter = (App: any) => {
  return class AppWithReactRouter extends React.Component {
    render() {
      if (isServer) {
        const { StaticRouter } = require('react-router-dom/server')

        return (
          <StaticRouter location={this.props.router.asPath}>
            <App {...this.props} />
          </StaticRouter>
        )
      }

      return (
        <BrowserRouter>
          <App {...this.props} />
        </BrowserRouter>
      )
    }
  }
}

export default withReactRouter
