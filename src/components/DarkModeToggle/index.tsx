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
    <button
      onClick={() => {
        isDarkMode
          ? document.body.classList.remove('dark')
          : document.body.classList.add('dark')
        toggle()
      }}
      className="flex items-center"
    >
      <span className="material-icons">
        {isDarkMode ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}
