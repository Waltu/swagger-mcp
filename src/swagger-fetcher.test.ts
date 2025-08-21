import { beforeEach, describe, expect, it, vi } from "vitest"
import { SwaggerFetcher } from "./swagger-fetcher.js"
import type { SwaggerService } from "./types.js"

vi.mock("node-fetch")

describe("SwaggerFetcher", () => {
  const mockServices: SwaggerService[] = [
    {
      name: "Test Service 1",
      slug: "test-service-1",
      baseUrl: "http://test1.example.com",
      openApiPath: "/swagger.json",
      group: "Group A",
    },
    {
      name: "Test Service 2",
      slug: "test-service-2",
      baseUrl: "http://test2.example.com",
      openApiPath: "/api-docs",
      group: "Group B",
    },
    {
      name: "Test Service 3",
      slug: "test-service-3",
      baseUrl: "http://test3.example.com",
      openApiPath: "/swagger.json",
      group: "Group A",
    },
  ]

  let fetcher: SwaggerFetcher

  beforeEach(() => {
    fetcher = new SwaggerFetcher(mockServices)
    vi.clearAllMocks()
  })

  describe("getServices", () => {
    it("should return all services", () => {
      const services = fetcher.getServices()
      expect(services).toEqual(mockServices)
    })
  })

  describe("getServicesByGroup", () => {
    it("should return services filtered by group", () => {
      const groupAServices = fetcher.getServicesByGroup("Group A")
      expect(groupAServices).toHaveLength(2)
      expect(groupAServices[0].group).toBe("Group A")
      expect(groupAServices[1].group).toBe("Group A")
    })

    it("should return empty array for non-existent group", () => {
      const services = fetcher.getServicesByGroup("Non-existent")
      expect(services).toEqual([])
    })
  })

  describe("getGroups", () => {
    it("should return unique groups", () => {
      const groups = fetcher.getGroups()
      expect(groups).toEqual(["Group A", "Group B"])
    })
  })

  describe("searchServices", () => {
    it("should find services by name", () => {
      const results = fetcher.searchServices("Test Service 1")
      expect(results).toHaveLength(1)
      expect(results[0].slug).toBe("test-service-1")
    })

    it("should find services by slug", () => {
      const results = fetcher.searchServices("service-2")
      expect(results).toHaveLength(1)
      expect(results[0].slug).toBe("test-service-2")
    })

    it("should find services by group", () => {
      const results = fetcher.searchServices("Group A")
      expect(results).toHaveLength(2)
    })

    it("should be case insensitive", () => {
      const results = fetcher.searchServices("GROUP a")
      expect(results).toHaveLength(2)
    })

    it("should return empty array for no matches", () => {
      const results = fetcher.searchServices("nonexistent")
      expect(results).toEqual([])
    })
  })

  describe("clearCache", () => {
    it("should clear the cache", () => {
      fetcher.clearCache()
      expect(fetcher.cache.size).toBe(0)
    })
  })

  describe("setCacheTimeout", () => {
    it("should set cache timeout", () => {
      fetcher.setCacheTimeout(60000)
      expect(fetcher.cacheTimeout).toBe(60000)
    })
  })
})
