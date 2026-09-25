import { useReducer } from 'react'
import { chatReducer, incomingAction, initialChatsState } from '../state/chatReducer'
import type { ChatMessage } from '../types/chat'
import type { NotificationBody } from '../types/greenApi'

export function useChats() {
  const [state, dispatch] = useReducer(chatReducer, initialChatsState)

  function createChat(value: string): string | null {
    const chatId = value.trim()
    if (!chatId) return null
    dispatch({ type: 'create', chatId })
    return chatId
  }

  function selectChat(chatId: string) {
    dispatch({ type: 'select', chatId })
  }

  function addOutgoing(chatId: string, message: ChatMessage) {
    dispatch({ type: 'outgoing', chatId, message })
  }

  function receiveIncoming(body: NotificationBody) {
    const action = incomingAction(body)
    if (action) dispatch(action)
  }

  return { state, createChat, selectChat, addOutgoing, receiveIncoming }
}
