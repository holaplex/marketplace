# Install dependencies only when needed
FROM node:16-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:16-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

#GraphQL
ARG GRAPHQL_URI
ENV NEXT_PUBLIC_GRAPHQL_ENDPOINT $GRAPHQL_URI

#Env
ARG NEXT_ENVIRONMENT
ENV NEXT_PUBLIC_ENVIRONMENT $NEXT_ENVIRONMENT
ENV NODE_ENV $NEXT_ENVIRONMENT
#Solana
ARG SOLANA_ENDPOINT
ENV SOLANA_ENDPOINT $SOLANA_ENDPOINT
ENV NEXT_PUBLIC_SOLANA_ENDPOINT $SOLANA_ENDPOINT

RUN yarn build


# Production image, copy all the files and run next
FROM node:16-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1
RUN yarn add next@12.0.7
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# You only need to copy next.config.js if you are NOT using the default configuration
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["yarn", "start"]
