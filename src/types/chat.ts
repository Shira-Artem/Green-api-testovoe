export type Chat = {
  id: string
  phoneNumber: number | null
  chatId: string
  username?: string
  displayName?: string
}

export type ChatMessage = {
  idMessage: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

export type ChatsState = {
  chats: Chat[]
  messagesByChat: Record<string, ChatMessage[]>
  activeChatId: string | null
}
