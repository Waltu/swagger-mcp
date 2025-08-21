import fetch from "node-fetch"
import type { CachedSwagger, SwaggerDocument, SwaggerService } from "./types.js"

export class SwaggerFetcher {
  private cache: Map<string, CachedSwagger> = new Map()
  private cacheTimeout: number = 30 * 60 * 1000 // 30 minutes

  constructor(private services: SwaggerService[]) {}

  async fetchSwagger(slug: string): Promise<SwaggerDocument | null> {
    const cached = this.cache.get(slug)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.document
    }

    const service = this.services.find((s) => s.slug === slug)
    if (!service) {
      throw new Error(`Service with slug "${slug}" not found`)
    }

    try {
      const url = `${service.baseUrl}${service.openApiPath}`
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch swagger from ${url}: ${response.statusText}`)
      }

      const document = (await response.json()) as SwaggerDocument

      this.cache.set(slug, {
        document,
        timestamp: Date.now(),
        service,
      })

      return document
    } catch (error) {
      console.error(`Error fetching swagger for ${slug}:`, error)
      return null
    }
  }

  async fetchMultipleSwaggers(slugs: string[]): Promise<Map<string, SwaggerDocument>> {
    const results = new Map<string, SwaggerDocument>()

    await Promise.all(
      slugs.map(async (slug) => {
        const doc = await this.fetchSwagger(slug)
        if (doc) {
          results.set(slug, doc)
        }
      }),
    )

    return results
  }

  getServices(): SwaggerService[] {
    return this.services
  }

  getServicesByGroup(group: string): SwaggerService[] {
    return this.services.filter((s) => s.group === group)
  }

  getGroups(): string[] {
    return [...new Set(this.services.map((s) => s.group))]
  }

  searchServices(query: string): SwaggerService[] {
    const lowerQuery = query.toLowerCase()
    return this.services.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.slug.toLowerCase().includes(lowerQuery) ||
        s.group.toLowerCase().includes(lowerQuery),
    )
  }

  clearCache(): void {
    this.cache.clear()
  }

  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout
  }
}
