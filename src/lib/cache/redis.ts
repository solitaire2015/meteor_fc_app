import { createClient, type RedisClientType } from 'redis'

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: RedisClientType | undefined
  // eslint-disable-next-line no-var
  var __redisClientPromise: Promise<RedisClientType> | undefined
}

const REDIS_DISABLED = process.env.REDIS_DISABLED === 'true'

function buildRedisUrl(): string | null {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL
  }

  const host = process.env.REDIS_HOST
  if (!host) {
    return null
  }

  const port = process.env.REDIS_PORT || '6379'
  const password = process.env.REDIS_PASSWORD
  const authSegment = password ? `:${encodeURIComponent(password)}@` : ''

  return `redis://${authSegment}${host}:${port}`
}

export function isCacheEnabled(): boolean {
  return !REDIS_DISABLED && !!buildRedisUrl()
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!isCacheEnabled()) {
    return null
  }

  if (global.__redisClient && global.__redisClient.isOpen) {
    return global.__redisClient
  }

  if (!global.__redisClientPromise) {
    const redisUrl = buildRedisUrl()
    if (!redisUrl) {
      return null
    }

    const client = createClient({ url: redisUrl })
    client.on('error', (error) => {
      console.error('Redis client error:', error)
    })

    global.__redisClientPromise = client.connect().then(() => {
      global.__redisClient = client
      return client
    })
  }

  try {
    return await global.__redisClientPromise
  } catch (error) {
    console.error('Failed to connect to Redis:', error)
    global.__redisClientPromise = undefined
    return null
  }
}
