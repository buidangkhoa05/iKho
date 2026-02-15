import { Moon, Sun, Monitor } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useTheme } from './ThemeProvider'
import { useState } from 'react'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-5 w-5" />
    if (theme === 'dark') return <Moon className="h-5 w-5" />
    return <Monitor className="h-5 w-5" />
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-secondary dark:bg-slate-950 dark:border-slate-800 text-secondary-foreground dark:text-gray-200">
      <div className="container flex h-14 items-center px-4 md:px-6 mx-auto">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2 font-bold text-xl text-secondary-foreground dark:text-gray-100">
            <span className="hidden font-bold sm:inline-block">My App</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className="transition-colors hover:text-secondary-foreground/80 text-secondary-foreground/60 dark:text-gray-400 dark:hover:text-gray-200"
              activeProps={{ className: 'text-secondary-foreground dark:text-gray-100' }}
            >
              Home
            </Link>
          </nav>
        </div>
        
        {/* Mobile Menu Button - Placeholder for real implementation if needed */}
        <button 
          className="inline-flex items-center justify-center rounded-md md:hidden p-2 text-secondary-foreground dark:text-gray-200"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="sr-only">Open main menu</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search or other header items can go here */}
          </div>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-white/10 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 w-9 text-secondary-foreground dark:text-gray-200"
            title={`Current theme: ${theme}`}
          >
            {getThemeIcon()}
            <span className="sr-only">Toggle theme</span>
          </button>
        </div>
      </div>
    </header>
  )
}
