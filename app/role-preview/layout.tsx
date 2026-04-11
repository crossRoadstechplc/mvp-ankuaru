/**
 * Standalone layout (no admin chrome) so iframe previews stay compact.
 */
export default function RolePreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-white">{children}</div>
}
