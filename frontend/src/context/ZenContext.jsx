import { createContext, useContext, useState } from 'react'

const ZenContext = createContext(null)

export function ZenProvider({ children }) {
  const [isZen, setIsZen] = useState(false)

  const enterZen = () => setIsZen(true)
  const exitZen  = () => setIsZen(false)
  const toggleZen = () => setIsZen(p => !p)

  return (
    <ZenContext.Provider value={{ isZen, enterZen, exitZen, toggleZen }}>
      {children}
    </ZenContext.Provider>
  )
}

export function useZen() {
  return useContext(ZenContext)
}
