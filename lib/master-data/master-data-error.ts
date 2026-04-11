/**
 * HTTP-style error for master data and domain APIs. Kept in a tiny module with no Node
 * built-ins so client bundles can import it without pulling `crud` / `fs`.
 */
export class MasterDataError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'MasterDataError'
    this.status = status
    this.code = code
  }
}
