import { useApiGateway } from '@/utils/useApiGateway'
import { useEventBus } from '@vueuse/core'
import { EVENT_CRUD, type CrudEventPayload } from '@/types/events'
import type { ResourceQuery } from '@/types/query'
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { PaginatedResult } from './useResourceService'

/**
 * Google Workflow definition interface
 */
export interface WorkflowDefinition {
  name?: string
  description?: string
  sourceContents?: string
  serviceAccount?: string
  labels?: Record<string, string>
  state?: 'ACTIVE' | 'INACTIVE'
}

/**
 * Google Workflow interface
 */
export interface Workflow {
  name: string
  description?: string
  state: 'ACTIVE' | 'INACTIVE'
  revisionId: string
  createTime: string
  updateTime: string
  labels?: Record<string, string>
  serviceAccount?: string
  sourceContents?: string
}

/**
 * Google Workflow Execution interface
 */
export interface WorkflowExecution {
  name: string
  state: 'ACTIVE' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  argument?: string
  result?: string
  error?: {
    code: number
    message: string
    details?: unknown[]
  }
  startTime: string
  endTime?: string
  duration?: string
  workflowRevision?: string
  labels?: Record<string, string>
}

/**
 * Google Workflow service interface providing CRUD operations with reactive state management
 */
export interface GoogleWorkflowService {
  // Workflow Management
  /** List workflows in the project/location */
  listWorkflows: (query?: ResourceQuery, signal?: AbortSignal) => Promise<PaginatedResult<Workflow>>
  /** Get a specific workflow by ID */
  getWorkflow: (workflowId: string, signal?: AbortSignal) => Promise<Workflow>
  /** Create a new workflow */
  createWorkflow: (workflow: WorkflowDefinition, signal?: AbortSignal) => Promise<Workflow>
  /** Update an existing workflow */
  updateWorkflow: (
    workflowId: string,
    updates: Partial<WorkflowDefinition>,
    signal?: AbortSignal,
  ) => Promise<Workflow>
  /** Delete a workflow */
  deleteWorkflow: (workflowId: string, signal?: AbortSignal) => Promise<void>

  // Workflow Executions
  /** List executions for a workflow */
  listExecutions: (
    workflowId: string,
    query?: ResourceQuery,
    signal?: AbortSignal,
  ) => Promise<PaginatedResult<WorkflowExecution>>
  /** Get a specific execution by ID */
  getExecution: (
    workflowId: string,
    executionId: string,
    signal?: AbortSignal,
  ) => Promise<WorkflowExecution>
  /** Start a new workflow execution */
  createExecution: (
    workflowId: string,
    argument?: unknown,
    signal?: AbortSignal,
  ) => Promise<WorkflowExecution>
  /** Cancel a running execution */
  cancelExecution: (
    workflowId: string,
    executionId: string,
    signal?: AbortSignal,
  ) => Promise<WorkflowExecution>

  /** Reactive boolean indicating if any operation is currently loading */
  isLoading: Ref<boolean>
  /** Check if a specific operation is loading */
  isOperationLoading: (operation: string) => boolean

  /** Reactive array of workflows from list operations */
  workflows: Ref<Workflow[]>
  /** Reactive single workflow from getWorkflow operations */
  workflow: Ref<Workflow | null>
  /** Reactive array of executions from listExecutions operations */
  executions: Ref<WorkflowExecution[]>
  /** Reactive single execution from getExecution operations */
  execution: Ref<WorkflowExecution | null>
  /** Reactive pagination information */
  pagination: Ref<{
    page: number
    limit: number
    total: number
    totalPages: number
  }>
  /** Reactive error message */
  error: Ref<string | null>

  /** Computed boolean indicating if there are workflows */
  hasWorkflows: ComputedRef<boolean>
  /** Computed boolean indicating if there are executions */
  hasExecutions: ComputedRef<boolean>
  /** Computed boolean indicating if no items and not loading */
  isEmpty: ComputedRef<boolean>
  /** Computed boolean indicating if there's an error */
  hasError: ComputedRef<boolean>

  /** Clear the current error */
  clearError: () => void
  /** Reset all data to initial state */
  clearData: () => void
}

/**
 * Creates a Google Workflow service instance with CRUD operations, loading states, and reactive data management
 *
 * @param name - API base name, defaults to "workflows"
 * @returns Google Workflow service instance with methods and reactive data
 *
 * @example
 * ```typescript
 * // Basic usage
 * const workflowApi = useGoogleWorkflow();
 * await workflowApi.listWorkflows();
 *
 * // With custom base name
 * const workflowApi = useGoogleWorkflow("custom-workflows");
 *
 * // Type-safe usage
 * const workflowApi = useGoogleWorkflow<Workflow>();
 * ```
 */
export function useGoogleWorkflow(name: string = 'workflows'): GoogleWorkflowService {
  const client = useApiGateway(name)
  const crudBus = useEventBus<CrudEventPayload>(EVENT_CRUD)

  // Get Google Cloud configuration from environment variables
  const getGoogleCloudConfig = () => {
    const env = (import.meta as { env?: Record<string, unknown> }).env || {}
    const project = env.VITE_GOOGLE_CLOUD_PROJECT as string
    const location = env.VITE_GOOGLE_CLOUD_LOCATION as string

    if (!project || !location) {
      throw new Error(
        'Google Cloud configuration missing. Please set VITE_GOOGLE_CLOUD_PROJECT and VITE_GOOGLE_CLOUD_LOCATION environment variables.',
      )
    }

    return { project, location }
  }

  // Loading state management
  const loadingStates = ref<Record<string, boolean>>({})

  /**
   * Computed property indicating if any operation is currently loading
   */
  const isLoading = computed(() => Object.values(loadingStates.value).some(Boolean))

  /**
   * Set loading state for a specific operation
   * @param operation - Operation identifier (e.g., "list:workflows", "create:workflow")
   * @param loading - Whether the operation is loading
   */
  const setLoading = (operation: string, loading: boolean) => {
    if (loading) {
      loadingStates.value[operation] = true
    } else {
      delete loadingStates.value[operation]
    }
  }

  /**
   * Check if a specific operation is currently loading
   * @param operation - Operation identifier
   * @returns True if the operation is loading
   */
  const isOperationLoading = (operation: string) => loadingStates.value[operation] || false

  // Reactive data management
  const workflows = ref<Workflow[]>([])
  const workflow = ref<Workflow | null>(null)
  const executions = ref<WorkflowExecution[]>([])
  const execution = ref<WorkflowExecution | null>(null)
  const pagination = ref<{
    page: number
    limit: number
    total: number
    totalPages: number
  }>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const error = ref<string | null>(null)

  // Computed helpers
  /**
   * Computed boolean indicating if there are workflows
   */
  const hasWorkflows = computed(() => workflows.value.length > 0)

  /**
   * Computed boolean indicating if there are executions
   */
  const hasExecutions = computed(() => executions.value.length > 0)

  /**
   * Computed boolean indicating if there are no items and not currently loading
   */
  const isEmpty = computed(
    () => !isLoading.value && workflows.value.length === 0 && executions.value.length === 0,
  )

  /**
   * Computed boolean indicating if there's an error
   */
  const hasError = computed(() => error.value !== null)

  /**
   * Internal request method with error handling and connection error detection
   * @param endpoint - API endpoint path
   * @param options - Fetch options
   * @returns Parsed JSON response
   */
  const request = async <T>(
    endpoint: string,
    options: RequestInit & { signal?: AbortSignal } = {},
  ): Promise<T> => {
    try {
      // Ensure Google Cloud env is present before any network work
      getGoogleCloudConfig()
      const res = await client.request(endpoint, options)
      if (!res.ok) {
        let message = `HTTP error! status: ${res.status}`
        const contentType = res.headers.get('content-type') || ''
        if (/application\/json/.test(contentType)) {
          try {
            const err: unknown = await res.json()
            if (err && typeof err === 'object') {
              message =
                (err as { message?: string }).message ||
                (err as { error?: string }).error ||
                message
            }
          } catch {
            /* ignore */
          }
        }
        throw new Error(message)
      }
      const contentType = res.headers.get('content-type') || ''
      if (!/application\/json/.test(contentType)) {
        const text = await res.text().catch(() => '')
        throw new Error(
          'Server returned non-JSON response. Verify API base URL and endpoint. Sample: ' +
            text.slice(0, 120),
        )
      }
      return await res.json()
    } catch (error: unknown) {
      if (
        (error as Error)?.name === 'AbortError' ||
        /Failed to fetch|NetworkError/.test(String(error))
      ) {
        throw new Error(
          'Unable to reach Google Workflows API. Check connectivity and configuration.',
        )
      }
      throw error
    }
  }

  /**
   * Convert query parameters to URL search params
   */
  const toSearchParams = (input: ResourceQuery): URLSearchParams => {
    const search = new URLSearchParams()
    const append = (key: string, value: unknown) => {
      if (value === undefined || value === null) return
      if (value instanceof Date) {
        search.append(key, value.toISOString())
      } else if (Array.isArray(value)) {
        search.append(key, value.map((v) => String(v)).join(','))
      } else {
        search.append(key, String(value))
      }
    }
    const build = (prefix: string, value: unknown) => {
      if (value === undefined || value === null) return
      if (value instanceof Date || typeof value !== 'object' || Array.isArray(value)) {
        append(prefix, value)
        return
      }
      Object.entries(value).forEach(([k, v]) => build(`${prefix}[${k}]`, v))
    }
    Object.entries(input).forEach(([k, v]) => build(k, v))
    return search
  }

  /**
   * List workflows in the project/location
   */
  const listWorkflows = async (
    query?: ResourceQuery,
    signal?: AbortSignal,
  ): Promise<PaginatedResult<Workflow>> => {
    const operation = 'list:workflows'
    setLoading(operation, true)
    error.value = null
    try {
      // Validate Google Cloud configuration eagerly so tests and runtime fail before any network logic
      getGoogleCloudConfig()
      const search = query ? toSearchParams(query) : new URLSearchParams()
      const q = search.toString()
      const payload = (await request<unknown>(q ? `workflows?${q}` : 'workflows', {
        signal,
      })) as Record<string, unknown>
      const workflowsList = (payload.workflows as Workflow[]) || []

      // Google Workflows API doesn't return pagination info in the same format
      // We'll simulate it based on the response
      const result: PaginatedResult<Workflow> = {
        data: workflowsList,
        pagination: {
          page: 1,
          limit: workflowsList.length,
          total: workflowsList.length,
          totalPages: 1,
        },
      }

      // Update reactive data
      workflows.value = result.data
      pagination.value = result.pagination

      return result
    } catch (err: unknown) {
      error.value = (err as Error)?.message || 'Failed to load workflows'
      throw err
    } finally {
      setLoading(operation, false)
    }
  }

  /**
   * Get a specific workflow by ID
   */
  const getWorkflow = async (workflowId: string, signal?: AbortSignal): Promise<Workflow> => {
    const operation = `get:workflow:${workflowId}`
    setLoading(operation, true)
    error.value = null
    try {
      const result = await request<Workflow>(`workflows/${workflowId}`, { signal })

      // Update reactive data
      workflow.value = result

      return result
    } catch (err: unknown) {
      error.value = (err as Error)?.message || 'Failed to load workflow'
      throw err
    } finally {
      setLoading(operation, false)
    }
  }

  /**
   * Create a new workflow
   */
  const createWorkflow = async (
    workflowDef: WorkflowDefinition,
    signal?: AbortSignal,
  ): Promise<Workflow> => {
    const operation = 'create:workflow'
    setLoading(operation, true)
    error.value = null
    try {
      const result = await request<Workflow>('', {
        method: 'POST',
        body: JSON.stringify(workflowDef),
        signal,
      })

      // Update reactive data - add to workflows list
      workflows.value.unshift(result)
      pagination.value.total += 1

      // Emit CRUD event
      try {
        const workflowId = result.name.split('/').pop() || ''
        crudBus.emit({
          resource: 'workflows',
          id: workflowId,
          action: 'create',
          afterData: result,
          at: Date.now(),
        })
      } catch {
        /* ignore */
      }

      return result
    } catch (err: unknown) {
      error.value = (err as Error)?.message || 'Failed to create workflow'
      throw err
    } finally {
      setLoading(operation, false)
    }
  }

  /**
   * Update an existing workflow
   */
  const updateWorkflow = async (
    workflowId: string,
    updates: Partial<WorkflowDefinition>,
    signal?: AbortSignal,
  ): Promise<Workflow> => {
    const operation = `update:workflow:${workflowId}`
    setLoading(operation, true)
    error.value = null
    try {
      let beforeData: Workflow | null = null
      try {
        beforeData = await getWorkflow(workflowId, signal)
      } catch {
        /* ignore */
      }

      const result = await request<Workflow>(`${workflowId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        signal,
      })

      // Update reactive data
      if (workflow.value && workflow.value.name === result.name) {
        workflow.value = result
      }

      // Update in workflows list if present
      const workflowIndex = workflows.value.findIndex((w) => w.name === result.name)
      if (workflowIndex !== -1) {
        workflows.value[workflowIndex] = result
      }

      // Emit CRUD event
      try {
        crudBus.emit({
          resource: 'workflows',
          id: workflowId,
          action: 'update',
          beforeData,
          afterData: result,
          at: Date.now(),
        })
      } catch {
        /* ignore */
      }

      return result
    } catch (err: unknown) {
      error.value = (err as Error)?.message || 'Failed to update workflow'
      throw err
    } finally {
      setLoading(operation, false)
    }
  }

  /**
   * Delete a workflow
   */
  const deleteWorkflow = async (workflowId: string, signal?: AbortSignal): Promise<void> => {
    const operation = `delete:workflow:${workflowId}`
    setLoading(operation, true)
    error.value = null
    try {
      let beforeData: Workflow | null = null
      try {
        beforeData = await getWorkflow(workflowId, signal)
      } catch {
        /* ignore */
      }

      await request<void>(`${workflowId}`, {
        method: 'DELETE',
        signal,
      })

      // Update reactive data
      if (workflow.value && workflow.value.name.includes(workflowId)) {
        workflow.value = null
      }

      // Remove from workflows list
      const workflowIndex = workflows.value.findIndex((w) => w.name.includes(workflowId))
      if (workflowIndex !== -1) {
        workflows.value.splice(workflowIndex, 1)
        pagination.value.total = Math.max(0, pagination.value.total - 1)
      }

      // Emit CRUD event
      try {
        crudBus.emit({
          resource: 'workflows',
          id: workflowId,
          action: 'delete',
          beforeData,
          at: Date.now(),
        })
      } catch {
        /* ignore */
      }
    } catch (err: unknown) {
      error.value = (err as Error)?.message || 'Failed to delete workflow'
      throw err
    } finally {
      setLoading(operation, false)
    }
  }

  /**
   * List executions for a workflow
   */
  const listExecutions = async (
    workflowId: string,
    query?: ResourceQuery,
    signal?: AbortSignal,
  ): Promise<PaginatedResult<WorkflowExecution>> => {
    const operation = `list:executions:${workflowId}`
    setLoading(operation, true)
    error.value = null
    try {
      const search = query ? toSearchParams(query) : new URLSearchParams()
      const q = search.toString()
      const path = q
        ? `workflows/${workflowId}/executions?${q}`
        : `workflows/${workflowId}/executions`
      const payload = (await request<unknown>(path, { signal })) as Record<string, unknown>
      const executionsList = (payload.executions as WorkflowExecution[]) || []

      const result: PaginatedResult<WorkflowExecution> = {
        data: executionsList,
        pagination: {
          page: 1,
          limit: executionsList.length,
          total: executionsList.length,
          totalPages: 1,
        },
      }

      // Update reactive data
      executions.value = result.data
      pagination.value = result.pagination

      return result
    } catch (err: unknown) {
      error.value = (err as Error)?.message || 'Failed to load executions'
      throw err
    } finally {
      setLoading(operation, false)
    }
  }

  /**
   * Get a specific execution by ID
   */
  const getExecution = async (
    workflowId: string,
    executionId: string,
    signal?: AbortSignal,
  ): Promise<WorkflowExecution> => {
    const operation = `get:execution:${workflowId}:${executionId}`
    setLoading(operation, true)
    error.value = null
    try {
      const result = await request<WorkflowExecution>(`${workflowId}/executions/${executionId}`, {
        signal,
      })

      // Update reactive data
      execution.value = result

      return result
    } catch (err: unknown) {
      error.value = (err as Error)?.message || 'Failed to load execution'
      throw err
    } finally {
      setLoading(operation, false)
    }
  }

  /**
   * Start a new workflow execution
   */
  const createExecution = async (
    workflowId: string,
    argument?: unknown,
    signal?: AbortSignal,
  ): Promise<WorkflowExecution> => {
    const operation = `create:execution:${workflowId}`
    setLoading(operation, true)
    error.value = null
    try {
      const body = argument ? { argument: JSON.stringify(argument) } : {}
      const result = await request<WorkflowExecution>(`${workflowId}/executions`, {
        method: 'POST',
        body: JSON.stringify(body),
        signal,
      })

      // Update reactive data - add to executions list
      executions.value.unshift(result)
      pagination.value.total += 1

      return result
    } catch (err: unknown) {
      error.value = (err as Error)?.message || 'Failed to create execution'
      throw err
    } finally {
      setLoading(operation, false)
    }
  }

  /**
   * Cancel a running execution
   */
  const cancelExecution = async (
    workflowId: string,
    executionId: string,
    signal?: AbortSignal,
  ): Promise<WorkflowExecution> => {
    const operation = `cancel:execution:${workflowId}:${executionId}`
    setLoading(operation, true)
    error.value = null
    try {
      const result = await request<WorkflowExecution>(
        `${workflowId}/executions/${executionId}:cancel`,
        {
          method: 'POST',
          signal,
        },
      )

      // Update reactive data
      if (execution.value && execution.value.name === result.name) {
        execution.value = result
      }

      // Update in executions list if present
      const executionIndex = executions.value.findIndex((e) => e.name === result.name)
      if (executionIndex !== -1) {
        executions.value[executionIndex] = result
      }

      return result
    } catch (err: unknown) {
      error.value = (err as Error)?.message || 'Failed to cancel execution'
      throw err
    } finally {
      setLoading(operation, false)
    }
  }

  /**
   * Clear the current error state
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * Reset all data to initial state
   */
  const clearData = () => {
    workflows.value = []
    workflow.value = null
    executions.value = []
    execution.value = null
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    }
    error.value = null
  }

  return {
    // Workflow Management
    listWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,

    // Workflow Executions
    listExecutions,
    getExecution,
    createExecution,
    cancelExecution,

    // Loading state utilities
    isLoading,
    isOperationLoading,

    // Reactive data
    workflows,
    workflow,
    executions,
    execution,
    pagination,
    error,

    // Computed helpers
    hasWorkflows,
    hasExecutions,
    isEmpty,
    hasError,

    // Utility methods
    clearError,
    clearData,
  }
}
