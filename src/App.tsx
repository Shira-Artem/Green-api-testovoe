import { useState } from 'react'
import { useConnection } from './hooks/useConnection'
import { useMessenger } from './hooks/useMessenger'
import { ChatPage } from './pages/ChatPage'
import { ConnectionPage } from './pages/ConnectionPage'
import type { GreenApiCredentials } from './types/greenApi'

function App() {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(null)
  const connection = useConnection(setCredentials)

  if (!credentials) return <ConnectionPage {...connection} />
  return <ConnectedChat credentials={credentials} onDisconnect={() => setCredentials(null)} />
}

function ConnectedChat({ credentials, onDisconnect }: {
  credentials: GreenApiCredentials
  onDisconnect: () => void
}) {
  const messenger = useMessenger(credentials)
  return <ChatPage {...messenger} onDisconnect={onDisconnect} />
}

export default App
