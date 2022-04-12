# Marketplace

No-code Solana NFT marketplaces powered by Holaplex.

Tech Stack:

- Typescript
- Apollo GraphQL
- Next.JS/React

## Getting Started

Marketplaces is very easy to setup for local use or to be deployed on your own infrastructure. 

0. Create a Marketplace at https://holaplex.dev/marketplace/new
1. Clone the repo
2. `cd` into the folder
3. Install dependencies with `yarn install`
4. Edit `.env.development` and add the subdomain you chose in step 0, or any other active subdomain, eg: `espi`
5. Run it with `yarn dev`

## Create a Production Build 

To create a production ready build use `yarn build`. Build files can be found in `.next`.

Detailed documentation can be found at https://nextjs.org/docs/deployment#nextjs-build-api

## Proxy

The active marketplace can be set by the `x-holaplex-subdomain` request header. Starting the `nginx` with [default.conf](/main/templates/default.conf.template) will set the subdomain header based on the current hostname context of the request.
The nginx conf relies on envstub provided by the official [nginx image](https://hub.docker.com/_/nginx) on Dockerhub.

To start nginx using the required configuration, use the following command:

```bash
$ docker run --network=host -v $(pwd)/templates:/etc/nginx/templates \
-e HOSTNAME=dev.holaplex.market.127.0.0.1.nip.io -e PORT=80 -e WEB_PORT=3000 \
-e PROXY_HOST=127.0.0.1.nip.io nginx:latest
```

If you already have something running in port `80` already, feel free to change that to a different port. Keep in mind that you'll need to append `:<port>` on the url to access the NGINX server.

## Test your setup!

Open a test marketplace, like [espi's marketplace](http://espi.dev.holaplex.market.127.0.0.1.nip.io).
Page should load without issues.
