import { useState } from 'react'

export const DarkModeToggle = () => {
  const [isLightMode, setIsLightMode] = useState(
    document.body.classList.contains('light-mode')
  )

  return (
    <button
      onClick={() => {
        isLightMode
          ? document.body.classList.remove('light-mode')
          : document.body.classList.add('light-mode')
        setIsLightMode(!isLightMode)
      }}
      className="flex items-center"
    >
      <span className="material-icons">
        {isLightMode ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}
