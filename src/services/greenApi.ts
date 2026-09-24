import type { GreenApiCredentials, InstanceState, Notification } from '../types/greenApi'

export class GreenApiError extends Error {
  constructor(
    public readonly status: number | null,
    message: string,
    public readonly apiMessage?: string,
  ) {
    super(message)
    this.name = 'GreenApiError'
  }
}

type ApiErrorBody = {
  message?: unknown
  error?: unknown
  description?: unknown
  reason?: unknown
  invokeStatus?: { description?: unknown }
  correspondentsStatus?: { description?: unknown }
}

function apiErrorMessage(body: unknown): string | undefined {
  if (typeof body === 'string') return body.trim() || undefined
  if (!body || typeof body !== 'object') return undefined
  const data = body as ApiErrorBody
  const value = data.message ?? data.error ?? data.description ?? data.reason
    ?? data.correspondentsStatus?.description ?? data.invokeStatus?.description
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function readableError(status: number, apiMessage?: string): string {
  if (status === 400) return 'Некорректный запрос или настройки инстанса. Проверьте введённые данные.'
  if (status === 401) return 'Неверный API-токен инстанса.'
  if (status === 403) {
    return apiMessage?.toLowerCase().includes('suspend')
      ? 'Доступ к аккаунту временно ограничен (suspended). Проверьте состояние в GREEN-API.'
      : 'Доступ запрещён. Проверьте idInstance и apiUrl.'
  }
  if (status === 466) return 'Превышен лимит тарифа Telegram Developer: доступно 3 чата. Проверьте также квоту запросов в GREEN-API.'
  if (status === 469) return 'Telegram временно ограничил поиск контактов. Подождите перед новой проверкой.'
  return `Ошибка GREEN-API (HTTP ${status}). Попробуйте позже.`
}

export function createGreenApi(credentials: GreenApiCredentials) {
  const apiUrl = credentials.apiUrl.trim().replace(/\/+$/, '')
  const { idInstance, apiTokenInstance } = credentials
  const base = `${apiUrl}/waInstance${idInstance}`

  function endpoint(method: string) {
    return `${base}/${method}/${apiTokenInstance}`
  }

  function sanitize(message?: string) {
    if (!message) return undefined
    return message
      .replaceAll(apiTokenInstance, '[скрыто]')
      .replaceAll(encodeURIComponent(apiTokenInstance), '[скрыто]')
  }

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await fetch(url, init)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      throw new GreenApiError(null, 'Не удалось связаться с GREEN-API. Проверьте адрес и сеть.')
    }

    let body: unknown = null
    const raw = await response.text()
    if (raw.trim()) {
      try {
        body = JSON.parse(raw)
      } catch {
        body = raw
      }
    }

    if (!response.ok) {
      const original = sanitize(apiErrorMessage(body))
      throw new GreenApiError(response.status, readableError(response.status, original), original)
    }
    return body as T
  }

  return {
    async getStateInstance(signal?: AbortSignal): Promise<InstanceState> {
      const result = await request<{ stateInstance?: InstanceState }>(
        endpoint('getStateInstance'), { signal },
      )
      if (!result?.stateInstance) throw new GreenApiError(null, 'GREEN-API не вернул состояние инстанса.')
      return result.stateInstance
    },

    async checkAccount(phoneNumber: number): Promise<string | null> {
      const result = await request<{
        exist?: boolean
        chatId?: string
        status?: boolean
        reason?: string
        data?: { reason?: string }
      }>(endpoint('checkAccount'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })
      if (result?.exist === false) return null
      if (result?.exist === true && typeof result.chatId === 'string' && /^[1-9]\d*$/.test(result.chatId)) {
        return result.chatId
      }
      const reason = sanitize(result?.data?.reason ?? result?.reason)
      if (reason === 'rate_limit_exceeded') {
        throw new GreenApiError(200, 'Telegram ограничил частые проверки номеров. Подождите перед новой попыткой.', reason)
      }
      if (result?.status === false) {
        throw new GreenApiError(200, 'Не удалось проверить номер в Telegram. Проверьте состояние инстанса.', reason)
      }
      throw new GreenApiError(null, 'GREEN-API не вернул корректный chatId для номера.')
    },

    async sendMessage(chatId: string, message: string): Promise<string> {
      const result = await request<{ idMessage?: string }>(endpoint('sendMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
      })
      if (!result?.idMessage) throw new GreenApiError(null, 'GREEN-API не вернул idMessage.')
      return result.idMessage
    },

    async receiveNotification(signal?: AbortSignal): Promise<Notification | null> {
      const result = await request<Notification | null>(
        `${endpoint('receiveNotification')}?receiveTimeout=5`, { signal },
      )
      if (result === null) return null
      if (typeof result?.receiptId !== 'number' || !result.body) {
        throw new GreenApiError(null, 'GREEN-API вернул уведомление в неожиданном формате.')
      }
      return result
    },

    async deleteNotification(receiptId: number, signal?: AbortSignal): Promise<void> {
      const result = await request<{ result?: boolean }>(
        `${endpoint('deleteNotification')}/${receiptId}`,
        { method: 'DELETE', signal },
      )
      if (!result?.result) throw new GreenApiError(null, 'Не удалось удалить уведомление из очереди.')
    },
  }
}

export type GreenApi = ReturnType<typeof createGreenApi>
