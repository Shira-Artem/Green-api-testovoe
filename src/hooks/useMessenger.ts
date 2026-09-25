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
  const [isCheckingAccount, setIsCheckingAccount] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const sendingRef = useRef(false)
  const checkingRef = useRef(false)

  useNotifications(api, receiveIncoming, (error) => setPollError(errorText(error)))

  async function createChatByPhone(value: string): Promise<boolean> {
    if (checkingRef.current) return false
    const digits = value.replace(/\D/g, '')
    const phoneNumber = Number(digits)
    if (!digits || !Number.isSafeInteger(phoneNumber) || phoneNumber <= 0) {
      setCreateError('Введите номер телефона в международном формате.')
      return false
    }

    checkingRef.current = true
    setIsCheckingAccount(true)
    setCreateError(null)
    try {
      const account = await api.checkAccount(phoneNumber)
      if (!account) {
        setCreateError('Аккаунт Telegram по этому номеру не найден или номер скрыт настройками приватности.')
        return false
      }
      createChat({ ...account, displayName: account.username?.trim() || value.trim() })
      return true
    } catch (error) {
      setCreateError(errorText(error))
      return false
    } finally {
      checkingRef.current = false
      setIsCheckingAccount(false)
    }
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
    const chat = state.chats.find((item) => item.chatId === chatId)
    if (!chat) return false

    sendingRef.current = true
    setIsSending(true)
    setSendError(null)
    try {
      const idMessage = await api.sendMessage(chat.chatId, text)
      addOutgoing(chat.chatId, {
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

  return { state, createChatByPhone, isCheckingAccount, createError, chooseChat, sendText, isSending, sendError, pollError }
}
