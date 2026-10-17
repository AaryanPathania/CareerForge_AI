import React, { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import './layout.scss'
import { useAuth } from '../auth/hooks/useAuth'

// Small inline icons
const Icon = ({ path }) => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {path}
    </svg>
)

const logoutIcon = (
    <Icon
        path={
            <>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
            </>
        }
    />
)

const navItems = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Interviews', to: '/interview/new' },
    { label: 'Resumes', to: '/resumes' },
    { label: 'Profile', to: '/profile' },
]

const AuthenticatedLayout = () => {
    const { user, handleLogout } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)

    const initial = user?.username
        ? user.username.charAt(0).toUpperCase()
        : '?'

    const onLogout = async () => {
        await handleLogout()
    }

    return (
        <div className="app-shell">

            <header className="app-navbar">
                <div className="app-navbar__inner">

                    <Link
                        to="/dashboard"
                        className="app-navbar__logo"
                    >
                        CareerForge_AI
                    </Link>

                    <nav className="app-navbar__links">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `app-navbar__link${isActive ? ' is-active' : ''}`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="app-navbar__user">
                        <span
                            className="app-navbar__avatar"
                            title={user?.username}
                        >
                            {initial}
                        </span>

                        <span className="app-navbar__username">
                            {user?.username}
                        </span>

                        <button
                            type="button"
                            className="button ghost-button app-navbar__logout"
                            onClick={onLogout}
                        >
                            {logoutIcon}
                            Logout
                        </button>
                    </div>

                    <button
                        type="button"
                        className="app-navbar__toggle"
                        aria-label="Toggle menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>

                </div>

                {menuOpen && (
                    <div className="app-navbar__mobile">

                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                    `app-navbar__link${isActive ? ' is-active' : ''}`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}

                        <button
                            type="button"
                            className="button secondary-button"
                            onClick={onLogout}
                        >
                            {logoutIcon}
                            Logout
                        </button>

                    </div>
                )}
            </header>

            <main className="app-content">
                <Outlet />
            </main>

        </div>
    )
}

export default AuthenticatedLayout