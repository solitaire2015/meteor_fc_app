import { getRedisClient, isCacheEnabled } from '@/lib/cache/redis'

export const CACHE_PREFIX = 'meteor:database_cache'
export const CACHE_SCOPE = 'search_api'
export const DEFAULT_CACHE_TTL_SECONDS = 60 * 60 * 24
const TAG_TTL_BUFFER_SECONDS = 60 * 60

export const CACHE_TAGS = {
  USERS: 'users',
  PLAYERS: 'players',
  MATCHES: 'matches',
  GAMES: 'games',
  LEADERBOARD: 'leaderboard',
  STATS: 'stats',
  STATISTICS: 'statistics'
} as const

function normalizeSearchParams(searchParams: URLSearchParams): string {
  const entries = Array.from(searchParams.entries()).sort((a, b) => {
    if (a[0] === b[0]) {
      return a[1].localeCompare(b[1])
    }
    return a[0].localeCompare(b[0])
  })

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

export function buildCacheKey(url: URL, extraKey?: string): string {
  const normalizedPath = url.pathname.replace(/^\/+/, '').replace(/\//g, ':')
  const normalizedQuery = normalizeSearchParams(url.searchParams)
  const querySuffix = normalizedQuery ? `?${normalizedQuery}` : ''
  const extraSuffix = extraKey ? `:${extraKey}` : ''

  return `${CACHE_PREFIX}:${CACHE_SCOPE}:${normalizedPath}${querySuffix}${extraSuffix}`
}

function buildTagKey(tag: string): string {
  return `${CACHE_PREFIX}:tag:${tag}`
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  if (!isCacheEnabled()) {
    return null
  }

  const client = await getRedisClient()
  if (!client) {
    return null
  }

  try {
    const raw = await client.get(key)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn('Failed to read cache entry:', error)
    return null
  }
}

export async function setCachedJson<T>(options: {
  key: string
  value: T
  tags?: string[]
  ttlSeconds?: number
}): Promise<void> {
  if (!isCacheEnabled()) {
    return
  }

  const client = await getRedisClient()
  if (!client) {
    return
  }

  const { key, value, tags = [], ttlSeconds = DEFAULT_CACHE_TTL_SECONDS } = options

  try {
    const multi = client.multi()
    multi.set(key, JSON.stringify(value), { EX: ttlSeconds })

    const uniqueTags = Array.from(new Set(tags)).filter(Boolean)
    uniqueTags.forEach((tag) => {
      const tagKey = buildTagKey(tag)
      multi.sAdd(tagKey, key)
      multi.expire(tagKey, ttlSeconds + TAG_TTL_BUFFER_SECONDS)
    })

    await multi.exec()
  } catch (error) {
    console.warn('Failed to write cache entry:', error)
  }
}

export async function invalidateCacheTags(tags: string[]): Promise<void> {
  if (!isCacheEnabled()) {
    return
  }

  const client = await getRedisClient()
  if (!client) {
    return
  }

  const uniqueTags = Array.from(new Set(tags)).filter(Boolean)
  if (uniqueTags.length === 0) {
    return
  }

  try {
    const tagKeys = uniqueTags.map(buildTagKey)
    const keysToDelete = new Set<string>()

    for (const tagKey of tagKeys) {
      const members = await client.sMembers(tagKey)
      members.forEach((key) => keysToDelete.add(key))
    }

    if (keysToDelete.size > 0) {
      await client.del(...Array.from(keysToDelete))
    }

    await client.del(...tagKeys)
  } catch (error) {
    console.warn('Failed to invalidate cache tags:', error)
  }
}
