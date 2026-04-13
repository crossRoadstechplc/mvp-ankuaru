import { LoginClient } from '@/components/auth/login-client'
import { AnkuaruLogo } from '@/components/branding/ankuaru-logo'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.24),transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),transparent_35%),linear-gradient(135deg,_rgba(255,247,237,1),_rgba(226,232,240,0.88))] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-300/30 backdrop-blur sm:p-8 lg:p-10">
        <header className="text-center">
          <AnkuaruLogo className="justify-center" />
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Choose your workspace account</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Simulated sign-in for the MVP: pick a seeded user. No passwords. Session is stored in this browser only.
          </p>
        </header>
        <div className="mt-8">
          <LoginClient />
        </div>
      </div>
    </div>
  )
}
