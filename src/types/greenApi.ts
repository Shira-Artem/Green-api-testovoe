export type GreenApiCredentials = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type InstanceState = 'authorized' | 'notAuthorized' | 'blocked' | 'suspended' | 'starting' | 'pendingPassword'

export type NotificationBody = {
  typeWebhook?: string
  idMessage?: string
  timestamp?: number
  senderData?: {
    chatId?: string
    chatType?: string
    senderName?: string
    senderContactName?: string
    chatName?: string
  }
  messageData?: {
    typeMessage?: string
    textMessageData?: { textMessage?: string }
    extendedTextMessageData?: { text?: string }
  }
}

export type Notification = {
  receiptId: number
  body: NotificationBody
}
