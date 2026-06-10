import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from './Avatar'
import { ProfileModal } from './ProfileModal'

export function Header() {
  const { player, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img
            src="/logo.png"
            alt="FIFA World Cup 26"
            className="h-8 w-auto rounded-md bg-white p-1 sm:h-10"
          />
          <span className="truncate font-display text-sm font-extrabold text-sky-accent sm:text-xl">
            World Cup 2026 League
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {player?.is_admin && (
            <Link
              to={pathname === '/admin' ? '/' : '/admin'}
              className="btn-ghost px-3 py-2 text-xs sm:text-sm"
            >
              {pathname === '/admin' ? '← Dashboard' : '⚙ Admin'}
            </Link>
          )}
          {player && (
            <button
              onClick={() => setProfileOpen(true)}
              className="rounded-full ring-2 ring-transparent transition hover:ring-sky-accent/50"
              aria-label="Edit profile picture"
              title={player.display_name}
            >
              <Avatar url={player.avatar_url} name={player.display_name} size="md" />
            </button>
          )}
          <button className="btn-danger px-3 py-2 text-xs sm:text-sm" onClick={logout}>
            <span className="sm:hidden">⎋</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </nav>
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </header>
  )
}
