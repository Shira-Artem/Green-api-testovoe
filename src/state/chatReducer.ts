import type { Chat, ChatMessage, ChatsState } from '../types/chat'
import type { NotificationBody } from '../types/greenApi'

export const initialChatsState: ChatsState = {
  chats: [],
  messagesByChat: {},
  activeChatId: null,
}

export function normalizeChatId(value: string | undefined): string {
  const chatId = value?.trim() ?? ''
  return /^[1-9]\d*$/.test(chatId) ? chatId : ''
}

type ChatsAction =
  | { type: 'create'; chat: Chat }
  | { type: 'select'; chatId: string }
  | { type: 'outgoing'; chatId: string; message: ChatMessage }
  | { type: 'incoming'; chatId: string; displayName?: string; message: ChatMessage }

function hasMessage(state: ChatsState, chatId: string, idMessage: string): boolean {
  return (state.messagesByChat[chatId] ?? []).some((message) => message.idMessage === idMessage)
}

export function chatReducer(state: ChatsState, action: ChatsAction): ChatsState {
  if (action.type === 'create') {
    const existing = state.chats.find((chat) => chat.chatId === action.chat.chatId)
    if (existing) {
      return {
        ...state,
        chats: state.chats.map((chat) => chat.chatId === action.chat.chatId
          ? { ...chat, phoneNumber: action.chat.phoneNumber, username: action.chat.username,
              displayName: chat.displayName ?? action.chat.displayName }
          : chat),
        activeChatId: existing.id,
      }
    }
    const chat = action.chat
    return {
      ...state,
      chats: [chat, ...state.chats],
      activeChatId: chat.id,
    }
  }

  if (action.type === 'select') {
    return state.chats.some((chat) => chat.id === action.chatId)
      ? { ...state, activeChatId: action.chatId }
      : state
  }

  if (hasMessage(state, action.chatId, action.message.idMessage)) return state

  if (action.type === 'outgoing') {
    if (!state.chats.some((chat) => chat.chatId === action.chatId)) return state
    return {
      ...state,
      messagesByChat: {
        ...state.messagesByChat,
        [action.chatId]: [...(state.messagesByChat[action.chatId] ?? []), action.message],
      },
    }
  }

  const existing = state.chats.find((chat) => chat.chatId === action.chatId)
  const chatId = action.chatId
  const chat: Chat = {
    id: chatId,
    chatId,
    phoneNumber: existing?.phoneNumber ?? null,
    username: existing?.username,
    displayName: action.displayName ?? existing?.displayName,
  }

  return {
    chats: existing
      ? state.chats.map((item) => item.chatId === chatId ? chat : item)
      : [chat, ...state.chats],
    messagesByChat: {
      ...state.messagesByChat,
      [chatId]: [...(state.messagesByChat[chatId] ?? []), action.message],
    },
    activeChatId: state.activeChatId ?? chatId,
  }
}

export function incomingAction(body: NotificationBody): ChatsAction | null {
  if (body.typeWebhook !== 'incomingMessageReceived') return null
  const senderData = body.senderData
  if (!senderData || (senderData.chatType && senderData.chatType !== 'user')) return null
  const chatId = normalizeChatId(senderData.chatId)
  if (!chatId || !body.idMessage) return null

  const data = body.messageData
  let text: string | undefined
  if (data?.typeMessage === 'textMessage') text = data.textMessageData?.textMessage
  if (data?.typeMessage === 'extendedTextMessage') text = data.extendedTextMessageData?.text
  if (typeof text !== 'string') return null

  return {
    type: 'incoming',
    chatId,
    displayName: senderData.chatName?.trim()
      || senderData.senderContactName?.trim()
      || senderData.senderName?.trim()
      || undefined,
    message: {
      idMessage: body.idMessage,
      text,
      timestamp: body.timestamp ?? Math.floor(Date.now() / 1000),
      direction: 'incoming',
    },
  }
}
