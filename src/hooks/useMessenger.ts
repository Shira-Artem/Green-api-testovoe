import { useMemo, useRef, useState } from 'react'
import { useChats } from './useChats'
import { useNotifications } from './useNotifications'
import { errorText } from './useConnection'
import { createGreenApi } from '../services/greenApi'
import type { GreenApiCredentials } from '../types/greenApi'

export function useMessenger(credentials: GreenApiCredentials) {
  const api = useMemo(() => createGreenApi(credentials), [credentials])
  const { state, createChat, selectChat, addOutgoing, receiveIncoming } = useChats()
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const sendingRef = useRef(false)

  useNotifications(api, receiveIncoming, (error) => setPollError(errorText(error)))

  function createChatById(value: string): boolean {
    if (!value.trim()) {
      setCreateError('Введите Telegram chatId пользователя.')
      return false
    }

    setCreateError(null)
    return createChat(value) !== null
  }

  async function sendText(chatId: string, value: string): Promise<boolean> {
    const text = value.trim()
    if (!text) {
      setSendError('Введите текст сообщения.')
      return false
    }
    if (Array.from(text).length > 4096) {
      setSendError('Сообщение не должно быть длиннее 4096 символов.')
      return false
    }
    if (sendingRef.current || pollError) return false
    const chat = state.chats.find((item) => item.id === chatId)
    if (!chat) return false

    sendingRef.current = true
    setIsSending(true)
    setSendError(null)
    try {
      const idMessage = await api.sendMessage(chat.id, text)
      addOutgoing(chat.id, {
        idMessage,
        text,
        timestamp: Math.floor(Date.now() / 1000),
        direction: 'outgoing',
      })
      return true
    } catch (error) {
      setSendError(errorText(error))
      return false
    } finally {
      sendingRef.current = false
      setIsSending(false)
    }
  }

  function chooseChat(chatId: string) {
    setSendError(null)
    selectChat(chatId)
  }

  return { state, createChatById, createError, chooseChat, sendText, isSending, sendError, pollError }
}
