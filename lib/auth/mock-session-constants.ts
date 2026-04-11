/**
 * Mock auth header names — shared by the browser fetch bridge and API routes.
 * Kept free of Node/server imports so client bundles can import this file safely.
 */
export const MOCK_USER_ID_HEADER = 'x-ankuaru-user-id'
export const MOCK_USER_ROLE_HEADER = 'x-ankuaru-user-role'
