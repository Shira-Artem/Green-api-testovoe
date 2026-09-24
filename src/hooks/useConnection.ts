import { useState } from 'react'
import { createGreenApi, GreenApiError } from '../services/greenApi'
import type { GreenApiCredentials } from '../types/greenApi'

export function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Неизвестная ошибка. Попробуйте ещё раз.'
  if (error instanceof GreenApiError && error.apiMessage) {
    return `${error.message} Ответ API: ${error.apiMessage}`
  }
  return error.message
}

export function useConnection(onAuthorized: (credentials: GreenApiCredentials) => void) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function connect(credentials: GreenApiCredentials) {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const state = await createGreenApi(credentials).getStateInstance()
      if (state === 'authorized') {
        onAuthorized(credentials)
      } else {
        const messages: Record<string, string> = {
          notAuthorized: 'Инстанс не авторизован. Авторизуйте Telegram в личном кабинете GREEN-API.',
          blocked: 'Аккаунт Telegram заблокирован. Проверьте состояние в GREEN-API.',
          suspended: 'На аккаунте Telegram временные ограничения (suspended). Проверьте состояние в GREEN-API.',
          starting: 'Инстанс запускается. Подождите несколько минут и повторите попытку.',
          pendingPassword: 'Для авторизации нужен пароль двухфакторной аутентификации. Завершите вход в GREEN-API.',
        }
        setError(messages[state] ?? `Неизвестное состояние инстанса: ${state}`)
      }
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setLoading(false)
    }
  }

  return { connect, loading, error }
}
