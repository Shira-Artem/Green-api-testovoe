import { useEffect, useRef } from 'react'
import { GreenApiError, type GreenApi } from '../services/greenApi'
import type { NotificationBody } from '../types/greenApi'

function waitForRetry(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, 3000)
    function onAbort() {
      window.clearTimeout(timeout)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function useNotifications(
  api: GreenApi,
  onNotification: (body: NotificationBody) => void,
  onFatalError: (error: GreenApiError) => void,
) {
  const notificationRef = useRef(onNotification)
  const fatalErrorRef = useRef(onFatalError)
  notificationRef.current = onNotification
  fatalErrorRef.current = onFatalError

  useEffect(() => {
    const controller = new AbortController()

    async function poll() {
      while (!controller.signal.aborted) {
        try {
          const notification = await api.receiveNotification(controller.signal)
          if (!notification) continue

          try {
            notificationRef.current(notification.body)
          } finally {
            await api.deleteNotification(notification.receiptId)
          }
        } catch (error) {
          if (controller.signal.aborted) return
          if (error instanceof GreenApiError && [400, 401, 403, 466].includes(error.status ?? 0)) {
            fatalErrorRef.current(error)
            return
          }
          await waitForRetry(controller.signal)
        }
      }
    }

    void poll()
    return () => controller.abort()
  }, [api])
}

