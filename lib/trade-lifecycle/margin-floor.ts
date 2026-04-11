/** Maintenance floor for simulated price index (1.0 = par) from locked margin %. Client-safe — no Node APIs. */
export const marginMaintenanceFloorFromPercent = (marginPercent?: number): number =>
  Math.max(0.5, Math.min(0.99, 1 - (marginPercent ?? 15) / 100))
