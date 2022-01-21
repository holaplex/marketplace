import { useState, useEffect } from 'react'

export const DarkModeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(
    JSON.parse(localStorage.getItem('darkMode') || 'true')
  )

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
  }, [isDarkMode])

  const toggle = () => {
    setIsDarkMode(!isDarkMode)
    localStorage.setItem('darkMode', JSON.stringify(!isDarkMode))
  }

  return (
    <button onClick={toggle} className="flex items-center">
      <span className="material-icons">
        {isDarkMode ? 'dark_mode' : 'light_mode'}
      </span>
    </button>
  )
}
