# Marketplace

No-code Solana NFT marketplaces powered by Holaplex.

Tech Stack:

- Typescript
- Apollo GraphQL
- React

## Getting Started

Clone the repo, `cd` into the folder.
You can change the GraphQL endpoint for your own self-hosted one [repo available here](https://github.com/holaplex/solana-indexer).
In this case, we are using our `dev` GraphQL.

Start the node server in dev mode.
```bash
$ npm install
$ NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://graph-test.holaplex.com/v0 PORT=3000 npx next dev
```

## Proxy
The active marketplace can be set by the `x-holaplex-subdomain` request header. Starting the `nginx` with [default.conf](/main/templates/default.conf.template) will set the subdomain header based on the current hostname context of the request.
The nginx conf relies on envstub provided by the official [nginx image](https://hub.docker.com/_/nginx) on Dockerhub.

To start nginx using the required configuration, use the following command:
```bash
$ docker run --network=host -v $(pwd)/templates:/etc/nginx/templates -p 8080:4000 \
-e HOSTNAME=holaplex.market.127.0.0.1.nip.io -e PORT=80 -e WEB_PORT=3000 \
-e PROXY_HOST=127.0.0.1.nip.io nginx:latest
```

If you already have something running in port `80` already, feel free to change that to a different port.  Keep in mind that  you'll need to append `:<port>` on the url to access the NGINX server.

## Test your setup!
Open a test marketplace, like [espi's marketplace](http://espi.dev.holaplex.market.127.0.0.1.nip.io). Page should load without issues.
