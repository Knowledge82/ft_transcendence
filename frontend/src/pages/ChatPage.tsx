import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getGeneralChannel, startDirectConversation, getMessageHistory, getGeneralMembers } from '../api/chat';
import type { Conversation, Message, Member } from '../api/chat';
import { listFriends } from '../api/friends';
import type { Friend } from '../api/friends';
import { apiClient } from '../api/client';
import { useSocket } from '../context/SocketContext';

export function ChatPage() {
  const { socket } = useSocket();

  const [generalChannel, setGeneralChannel] = useState<Conversation | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [ownUserId, setOwnUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // A ref to an invisible element placed right after the last message.
  // Unlike useState, updating a ref does NOT trigger a re-render — we
  // just need a stable handle to the real DOM node to call the browser's
  // native scrollIntoView() on it.
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      getGeneralChannel(),
      listFriends(),
      getGeneralMembers(),
      apiClient.get<{ id: number }>('/users/me'),
    ])
      .then(([general, friendsList, membersList, me]) => {
        setGeneralChannel(general);
        setFriends(friendsList);
        setMembers(membersList);
        setOwnUserId(me.data.id);
        setSelectedConversationId(general.id);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    getMessageHistory(selectedConversationId).then((history) => {
      setMessages(history.reverse());
    });
  }, [selectedConversationId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    function handleNewMessage(message: Message) {
      if (message.conversationId === selectedConversationId) {
        setMessages((prev) => [...prev, message]);
      }
    }

    function handleStatusChanged({ userId, isOnline }: { userId: number; isOnline: boolean }) {
      setFriends((prev) =>
        prev.map((friend) => (friend.id === userId ? { ...friend, isOnline } : friend)),
      );
      setMembers((prev) =>
        prev.map((member) => (member.id === userId ? { ...member, isOnline } : member)),
      );
    }

    socket.on('newMessage', handleNewMessage);
    socket.on('userStatusChanged', handleStatusChanged);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userStatusChanged', handleStatusChanged);
    };
  }, [socket, selectedConversationId]);

  async function openDirectConversation(friendId: number) {
    const conversation = await startDirectConversation(friendId);
    setSelectedConversationId(conversation.id);
  }

  // Runs after every render where `messages` changed — including the
  // very first load of history and every newly received message
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages]);

  function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !selectedConversationId || !socket) {
      return;
    }
    socket.emit('sendMessage', {
      conversationId: selectedConversationId,
      content: draft.trim(),
    });
    setDraft('');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <p className="text-cream-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-ink-950">
      <aside className="w-64 bg-ink-900 border-r border-ink-800 flex flex-col">
        <div className="p-4 border-b border-ink-800">
          <Link to="/" className="text-sm text-gold-500 hover:text-gold-400">
            ← Volver
          </Link>
        </div>

        <div className="p-4">
          <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">Canales</h2>
          {generalChannel && (
            <button
              onClick={() => setSelectedConversationId(generalChannel.id)}
              className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                selectedConversationId === generalChannel.id
                  ? 'bg-gold-500 text-gold-on'
                  : 'text-cream-100 hover:bg-ink-800'
              }`}
            >
              # general
            </button>
          )}
        </div>

        <div className="p-4">
          <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">Amigos</h2>
          {friends.length === 0 && (
            <p className="text-sm text-cream-400">Todavía no tienes amigos añadidos.</p>
          )}
          {friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => openDirectConversation(friend.id)}
              className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-md mb-1 text-cream-100 hover:bg-ink-800 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  friend.isOnline ? 'bg-green-500' : 'bg-ink-800'
                }`}
              />
              {friend.displayName ?? `Usuario ${friend.id}`}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => {
            const isOwn = message.senderId === ownUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 ${
                    isOwn ? 'bg-gold-500 text-gold-on' : 'bg-ink-900 text-cream-100'
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs text-cream-400 mb-1">
                      {message.sender.displayName ?? `Usuario ${message.senderId}`}
                    </p>
                  )}
                  <p>{message.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-ink-800 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-md bg-ink-900 border border-ink-800 px-3 py-2 text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <button
            type="submit"
            className="bg-gold-500 text-gold-on font-medium px-4 py-2 rounded-md hover:bg-gold-400 transition-colors"
          >
            Enviar
          </button>
        </form>
      </main>

      {/* Right panel: always-visible presence list — everyone in the
          cult is a sibling, so the whole congregation's online status
          is public, not just close friends' */}
      <aside className="w-56 bg-ink-900 border-l border-ink-800 p-4 overflow-y-auto">
        <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">
          Hermanos ({members.filter((m) => m.isOnline).length}/{members.length})
        </h2>
        {[...members]
          .sort((a, b) => Number(b.isOnline) - Number(a.isOnline))
          .map((member) => (
            <div key={member.id} className="flex items-center gap-2 px-1 py-1.5">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  member.isOnline ? 'bg-green-500' : 'bg-ink-800'
                }`}
              />
              <span className="text-sm text-cream-100 truncate">
                {member.displayName ?? `Usuario ${member.id}`}
              </span>
            </div>
          ))}
      </aside>
    </div>
  );
}
