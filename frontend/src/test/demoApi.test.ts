import { beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'cloudpulse-demo-v1'

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY)
  vi.resetModules()
})

describe('demoApi activation behavior', () => {
  it('does not record checks for disabled endpoints and works after re-enabling', async () => {
    const { demoApi } = await import('../services/demoApi')
    const endpoint = await demoApi.get(3)
    const historyBefore = await demoApi.getResults(endpoint.id)

    expect(endpoint.is_active).toBe(false)
    await expect(demoApi.check(endpoint.id)).rejects.toThrow(/endpoint is disabled/i)
    expect(await demoApi.getResults(endpoint.id)).toEqual(historyBefore)

    await demoApi.update(endpoint.id, { is_active: true })
    await expect(demoApi.check(endpoint.id, 'success')).resolves.toMatchObject({
      endpoint_id: endpoint.id,
      status: 'success',
    })
  })
})
