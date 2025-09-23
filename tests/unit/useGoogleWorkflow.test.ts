import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGoogleWorkflow } from '../../src/composables/useGoogleWorkflow'

// Mock the dependencies
vi.mock('@/utils/useApiGateway')
vi.mock('@vueuse/core')
vi.mock('@/types/events')

describe('useGoogleWorkflow', () => {
  beforeEach(() => {
    // Mock environment variables
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_GOOGLE_CLOUD_PROJECT: 'test-project',
          VITE_GOOGLE_CLOUD_LOCATION: 'us-central1',
        },
      },
    })
  })

  it('should create a Google Workflow service instance', () => {
    const workflowService = useGoogleWorkflow()

    expect(workflowService).toBeDefined()
    expect(workflowService.listWorkflows).toBeDefined()
    expect(workflowService.getWorkflow).toBeDefined()
    expect(workflowService.createWorkflow).toBeDefined()
    expect(workflowService.updateWorkflow).toBeDefined()
    expect(workflowService.deleteWorkflow).toBeDefined()
    expect(workflowService.listExecutions).toBeDefined()
    expect(workflowService.getExecution).toBeDefined()
    expect(workflowService.createExecution).toBeDefined()
    expect(workflowService.cancelExecution).toBeDefined()
  })

  it('should have reactive state properties', () => {
    const workflowService = useGoogleWorkflow()

    expect(workflowService.isLoading).toBeDefined()
    expect(workflowService.workflows).toBeDefined()
    expect(workflowService.workflow).toBeDefined()
    expect(workflowService.executions).toBeDefined()
    expect(workflowService.execution).toBeDefined()
    expect(workflowService.pagination).toBeDefined()
    expect(workflowService.error).toBeDefined()
  })

  it('should have computed properties', () => {
    const workflowService = useGoogleWorkflow()

    expect(workflowService.hasWorkflows).toBeDefined()
    expect(workflowService.hasExecutions).toBeDefined()
    expect(workflowService.isEmpty).toBeDefined()
    expect(workflowService.hasError).toBeDefined()
  })

  it('should have utility methods', () => {
    const workflowService = useGoogleWorkflow()

    expect(workflowService.clearError).toBeDefined()
    expect(workflowService.clearData).toBeDefined()
    expect(workflowService.isOperationLoading).toBeDefined()
  })
})
