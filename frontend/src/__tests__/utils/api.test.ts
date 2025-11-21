import { fetchApi } from '@/shared/utils/api'
import { API_BASE_URL } from '@/shared/constants/api'

// Мокируем глобальный fetch
global.fetch = jest.fn()

describe('fetchApi', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('successful requests', () => {
    it('should return data on successful request', async () => {
      const mockData = { id: 1, name: 'Test' }
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      const result = await fetchApi<typeof mockData>('/test-endpoint')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        undefined
      )
      expect(result).toEqual(mockData)
    })

    it('should pass options to fetch', async () => {
      const mockData = { id: 1 }
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      }

      await fetchApi('/test-endpoint', options)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        options
      )
    })

    it('should use API_BASE_URL from constants', async () => {
      const mockData = { id: 1 }
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      await fetchApi('/test-endpoint')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(API_BASE_URL),
        undefined
      )
    })
  })

  describe('error handling', () => {
    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(fetchApi('/test-endpoint')).rejects.toThrow('Network error')
    })

    it('should throw error on 4xx response', async () => {
      const mockError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email' },
      }

      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ error: mockError }),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      await expect(fetchApi('/test-endpoint')).rejects.toThrow('Invalid input')
    })

    it('should throw error on 5xx response', async () => {
      const mockError = {
        code: 'INTERNAL_ERROR',
        message: 'Server error',
      }

      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({ error: mockError }),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      await expect(fetchApi('/test-endpoint')).rejects.toThrow('Server error')
    })

    it('should parse error from API response', async () => {
      const mockError = {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: { resource: 'route', id: '123' },
      }

      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({ error: mockError }),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      try {
        await fetchApi('/test-endpoint')
        fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Resource not found')
      }
    })

    it('should handle non-JSON error response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      await expect(fetchApi('/test-endpoint')).rejects.toThrow(
        'Internal Server Error'
      )
    })

    it('should handle error response without error object', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      await expect(fetchApi('/test-endpoint')).rejects.toThrow(
        'Internal Server Error'
      )
    })

    it('should handle error response with empty error message', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ error: {} }),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      await expect(fetchApi('/test-endpoint')).rejects.toThrow('Bad Request')
    })
  })

  describe('edge cases', () => {
    it('should handle empty response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(null),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      const result = await fetchApi('/test-endpoint')
      expect(result).toBeNull()
    })

    it('should handle endpoint with query parameters', async () => {
      const mockData = { results: [] }
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      await fetchApi('/test-endpoint?param1=value1&param2=value2')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint?param1=value1&param2=value2'),
        undefined
      )
    })

    it('should handle endpoint starting with slash', async () => {
      const mockData = { id: 1 }
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      } as unknown as Response

      mockFetch.mockResolvedValue(mockResponse)

      await fetchApi('/test-endpoint')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        undefined
      )
    })
  })
})

