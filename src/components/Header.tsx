import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function Header() {
  const { player, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/ball.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-lg font-extrabold text-sky-accent sm:text-xl">
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
            <span className="hidden text-sm text-white/60 sm:inline">
              {player.display_name}
            </span>
          )}
          <button className="btn-danger px-3 py-2 text-xs sm:text-sm" onClick={logout}>
            Logout
          </button>
        </nav>
      </div>
    </header>
  )
}
