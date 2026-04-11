import { LoginClient } from '@/components/auth/login-client'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_rgba(255,247,237,0.98),_rgba(226,232,240,0.92))] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:gap-10">
        <header className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-800">Ankuaru</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Choose an account</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Simulated sign-in for the MVP: pick a seeded user. No passwords. Session is stored in this browser only.
          </p>
        </header>
        <LoginClient />
      </div>
    </div>
  )
}
