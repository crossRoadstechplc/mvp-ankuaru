import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { validateDemoStore } from '@/lib/e2e/demo-validation'

describe('demo seed data', () => {
  it('passes validateDemoStore for the canonical cloneSeedData snapshot', () => {
    const result = validateDemoStore(cloneSeedData())
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.checks.multipleFarmers).toBe(true)
    expect(result.checks.transportFlow).toBe(true)
    expect(result.checks.aggregationPath).toBe(true)
  })
})
