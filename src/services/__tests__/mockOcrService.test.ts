import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitDocumentForOcr } from '../mockOcrService'

describe('mockOcrService', () => {
  beforeEach(() => {
    // Reset Math.random mock before each test
    vi.restoreAllMocks()
  })

  describe('submitDocumentForOcr', () => {
    it('should return verified result for NCB document type', async () => {
      // Mock Math.random to avoid network error and ensure success
      // Need multiple calls: network check + delays + success check + random data generation
      vi.spyOn(Math, 'random').mockReturnValue(0.3)

      const mockFile = new File(['test'], 'ncb.pdf', { type: 'application/pdf' })
      const result = await submitDocumentForOcr(mockFile, 'NCB')

      expect(result.status).toBe('verified')
      expect(result.docType).toBe('NCB')
      if (result.status === 'verified') {
        expect(result.extractedData).toBeDefined()
        expect(result.extractedData).toHaveProperty('yearsNoClaims')
        expect(result.extractedData).toHaveProperty('insurerName')
      }
    })

    it('should return verified result for GAP_COVER document type', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3)

      const mockFile = new File(['test'], 'gap.pdf', { type: 'application/pdf' })
      const result = await submitDocumentForOcr(mockFile, 'GAP_COVER')

      expect(result.status).toBe('verified')
      expect(result.docType).toBe('GAP_COVER')
      if (result.status === 'verified') {
        expect(result.extractedData).toBeDefined()
        expect(result.extractedData).toHaveProperty('gapDays')
        expect(result.extractedData).toHaveProperty('reason')
      }
    })

    it('should return verified result for POLICY_SCHEDULE document type', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3)

      const mockFile = new File(['test'], 'policy.pdf', { type: 'application/pdf' })
      const result = await submitDocumentForOcr(mockFile, 'POLICY_SCHEDULE')

      expect(result.status).toBe('verified')
      expect(result.docType).toBe('POLICY_SCHEDULE')
      if (result.status === 'verified') {
        expect(result.extractedData).toBeDefined()
        expect(result.extractedData).toHaveProperty('insurer')
        expect(result.extractedData).toHaveProperty('policyNumber')
      }
    })

    it('should return rejected result when success rate check fails', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.8) // > 0.7 = failure

      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const result = await submitDocumentForOcr(mockFile, 'NCB')

      expect(result.status).toBe('rejected')
      expect(result.docType).toBe('NCB')
      if (result.status === 'rejected') {
        expect(result.reason).toBeDefined()
        expect(['ILLEGIBLE_DOCUMENT', 'DATE_MISMATCH']).toContain(result.reason)
      }
    })

    it('should throw error when network error occurs', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01) // < 0.05 = network error

      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      await expect(submitDocumentForOcr(mockFile, 'NCB')).rejects.toThrow('OCR_SERVICE_UNAVAILABLE')
    }, 10000) // 10 second timeout for network error delay

    it('should have correct rejection reasons for each document type', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      // Test NCB rejection reasons
      vi.spyOn(Math, 'random').mockReturnValue(0.8) // Ensure rejection
      const ncbResult = await submitDocumentForOcr(mockFile, 'NCB')
      expect(ncbResult.status).toBe('rejected')
      if (ncbResult.status === 'rejected') {
        expect(['ILLEGIBLE_DOCUMENT', 'DATE_MISMATCH']).toContain(ncbResult.reason)
      }

      // Test GAP_COVER rejection reasons
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(0.8)
      const gapResult = await submitDocumentForOcr(mockFile, 'GAP_COVER')
      expect(gapResult.status).toBe('rejected')
      if (gapResult.status === 'rejected') {
        expect(['DATE_MISMATCH', 'UNSUPPORTED_FORMAT']).toContain(gapResult.reason)
      }

      // Test POLICY_SCHEDULE rejection reasons
      vi.restoreAllMocks()
      vi.spyOn(Math, 'random').mockReturnValue(0.8)
      const policyResult = await submitDocumentForOcr(mockFile, 'POLICY_SCHEDULE')
      expect(policyResult.status).toBe('rejected')
      if (policyResult.status === 'rejected') {
        expect(['UNSUPPORTED_FORMAT', 'ILLEGIBLE_DOCUMENT']).toContain(policyResult.reason)
      }
    }, 10000) // 10 second timeout for multiple API calls

    it('should simulate realistic delays', async () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.5)

      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const startTime = Date.now()

      await submitDocumentForOcr(mockFile, 'NCB')

      const duration = Date.now() - startTime
      // Should take at least minimum upload + scan delay (500 + 1000 = 1500ms)
      // Adding some buffer for test execution
      expect(duration).toBeGreaterThan(1000)
    }, 10000) // 10 second timeout for this test
  })
})
