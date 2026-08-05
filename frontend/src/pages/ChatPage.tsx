import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { getGeneralChannel, startDirectConversation, getMessageHistory, getGeneralMembers, getDirectConversations } from '../api/chat';
import type { Conversation, Message, Member, DirectConversationSummary } from '../api/chat';
import { listFriends, sendFriendRequest, listPendingRequests, acceptFriendRequest, removeFriend } from '../api/friends';
import type { Friend, PendingRequest } from '../api/friends';
import { apiClient } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { LoadingScreen, StatusDot, IconButton, Input, Button } from '../components/ui';

export function ChatPage() {
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [generalChannel, setGeneralChannel] = useState<Conversation | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [directConversations, setDirectConversations] = useState<DirectConversationSummary[]>([]);
  const [activeDmTarget, setActiveDmTarget] = useState<{
    id: number;
    displayName: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [channelLabel, setChannelLabel] = useState('# general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [ownUserId, setOwnUserId] = useState<number | null>(null);
  const [ownDisplayName, setOwnDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      getGeneralChannel(),
      listFriends(),
      getGeneralMembers(),
      listPendingRequests(),
      getDirectConversations(),
      apiClient.get<{ id: number; displayName: string | null }>('/users/me'),
    ])
      .then(([general, friendsList, membersList, pending, directList, me]) => {
        setGeneralChannel(general);
        setFriends(friendsList);
        setMembers(membersList);
        setPendingRequests(pending);
        setDirectConversations(directList);
        setOwnUserId(me.data.id);
        setOwnDisplayName(me.data.displayName);

        const dmParam = searchParams.get('dm');
        const dmId = dmParam ? Number(dmParam) : null;
        const matchingDm = dmId ? directList.find((c) => c.id === dmId) : undefined;
        const stateOtherUser = (location.state as { otherUser?: typeof activeDmTarget })
          ?.otherUser;

        if (matchingDm) {
          setSelectedConversationId(matchingDm.id);
          setChannelLabel(matchingDm.otherUser?.displayName ?? `Usuario ${matchingDm.otherUser?.id}`);
          setActiveDmTarget(matchingDm.otherUser);
        } else if (dmId && stateOtherUser) {
          setSelectedConversationId(dmId);
          setChannelLabel(stateOtherUser.displayName ?? `Usuario ${stateOtherUser.id}`);
          setActiveDmTarget(stateOtherUser);
        } else {
          setSelectedConversationId(general.id);
          setChannelLabel('# general');
        }
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

      const isFromSomeoneElse = message.senderId !== ownUserId;
      const isGeneralChannel = generalChannel && message.conversationId === generalChannel.id;
      if (isFromSomeoneElse && !isGeneralChannel) {
        setDirectConversations((prev) =>
          prev.some((c) => c.id === message.conversationId)
            ? prev
            : [
                ...prev,
                {
                  id: message.conversationId,
                  otherUser: { ...message.sender, isOnline: true },
                },
              ],
        );
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

    function handleMemberJoined(newMember: Member) {
      setMembers((prev) =>
        prev.some((m) => m.id === newMember.id) ? prev : [...prev, newMember],
      );
    }

    function handleFriendRequestReceived(request: PendingRequest) {
      setPendingRequests((prev) =>
        prev.some((r) => r.id === request.id) ? prev : [...prev, request],
      );
    }

    function handleFriendRequestAccepted(newFriend: Friend) {
      setFriends((prev) =>
        prev.some((f) => f.id === newFriend.id) ? prev : [...prev, { ...newFriend, isOnline: true }],
      );
    }

    socket.on('newMessage', handleNewMessage);
    socket.on('userStatusChanged', handleStatusChanged);
    socket.on('memberJoined', handleMemberJoined);
    socket.on('friendRequestReceived', handleFriendRequestReceived);
    socket.on('friendRequestAccepted', handleFriendRequestAccepted);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userStatusChanged', handleStatusChanged);
      socket.off('memberJoined', handleMemberJoined);
      socket.off('friendRequestReceived', handleFriendRequestReceived);
      socket.off('friendRequestAccepted', handleFriendRequestAccepted);
    };
  }, [socket, selectedConversationId]);

  async function openDirectConversation(friend: Friend) {
    const conversation = await startDirectConversation(friend.id);
    setSelectedConversationId(conversation.id);
    setChannelLabel(friend.displayName ?? `Usuario ${friend.id}`);
    setActiveDmTarget({ id: friend.id, displayName: friend.displayName, avatarUrl: friend.avatarUrl });
  }

  async function handleAddFriend(userId: number) {
    try {
      await sendFriendRequest(userId);
      setSentRequests((prev) => new Set(prev).add(userId));
    } catch (err) {
      console.error('No se pudo enviar la solicitud:', err);
    }
  }

  async function handleAcceptRequest(requesterId: number) {
    await acceptFriendRequest(requesterId);
    setPendingRequests((prev) => prev.filter((r) => r.requesterId !== requesterId));
    const updatedFriends = await listFriends();
    setFriends(updatedFriends);
  }

  async function handleRemoveFriend(userId: number) {
    if (!confirm('¿Seguro que quieres quitar a este hermano de tu lista de amigos?')) {
      return;
    }
    await removeFriend(userId);
    setFriends((prev) => prev.filter((f) => f.id !== userId));
  }

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

    if (
      activeDmTarget &&
      generalChannel &&
      selectedConversationId !== generalChannel.id &&
      !directConversations.some((c) => c.id === selectedConversationId)
    ) {
      setDirectConversations((prev) => [
        ...prev,
        { id: selectedConversationId, otherUser: { ...activeDmTarget, isOnline: false } },
      ]);
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-950">
      <header className="grid grid-cols-3 items-center px-4 py-2 bg-ink-900 border-b border-ink-800">
        <div />
        <span className="text-sm text-gold-500 font-medium text-center">{channelLabel}</span>
        <span className="text-sm text-cream-400 text-right">
          Conectado como <span className="text-gold-500 font-medium">{ownDisplayName ?? `Usuario ${ownUserId}`}</span>
        </span>
      </header>

      <div className="flex flex-1">
      <aside className="w-64 bg-ink-900 border-r border-ink-800 flex flex-col">
        <div className="p-4 border-b border-ink-800">
          <Link to="/altar" className="text-sm text-gold-500 hover:text-gold-400">
            ← Volver
          </Link>
        </div>

        <div className="p-4">
          <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">Canales</h2>
          {generalChannel && (
            <button
              onClick={() => {
                setSelectedConversationId(generalChannel.id);
                setChannelLabel('# general');
                setActiveDmTarget(null);
              }}
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

        {directConversations.length > 0 && (
          <div className="p-4 border-t border-ink-800">
            <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">
              Conversaciones
            </h2>
            {directConversations.map((conv) => {
              const label = conv.otherUser?.displayName ?? `Usuario ${conv.otherUser?.id}`;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversationId(conv.id);
                    setChannelLabel(label);
                    setActiveDmTarget(conv.otherUser);
                  }}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                    selectedConversationId === conv.id
                      ? 'bg-gold-500 text-gold-on'
                      : 'text-cream-100 hover:bg-ink-800'
                  }`}
                >
                  <StatusDot isOnline={conv.otherUser?.isOnline ?? false} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {pendingRequests.length > 0 && (
          <div className="p-4 border-t border-ink-800">
            <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">
              Solicitudes pendientes
            </h2>
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-2 mb-1">
                <Link
                  to={`/perfil/${request.requesterId}`}
                  className="text-sm text-cream-100 truncate hover:underline"
                >
                  {request.requester.displayName ?? `Usuario ${request.requesterId}`}
                </Link>
                <IconButton onClick={() => handleAcceptRequest(request.requesterId)}>
                  Aceptar
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div className="p-4">
          <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">Amigos</h2>
          {friends.length === 0 && (
            <p className="text-sm text-cream-400">Todavía no tienes amigos añadidos.</p>
          )}
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-2 px-3 py-2 rounded-md mb-1 hover:bg-ink-800 transition-colors"
            >
              <StatusDot isOnline={friend.isOnline} />
              <Link
                to={`/perfil/${friend.id}`}
                className="flex-1 text-left text-sm text-cream-100 truncate hover:underline"
              >
                {friend.displayName ?? `Usuario ${friend.id}`}
              </Link>
              <IconButton onClick={() => openDirectConversation(friend)} title="Enviar mensaje">
                ✉
              </IconButton>
              <IconButton
                tone="danger"
                onClick={() => handleRemoveFriend(friend.id)}
                title="Quitar amigo"
              >
                ✕
              </IconButton>
            </div>
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
                    <Link
                      to={`/perfil/${message.senderId}`}
                      className="text-xs text-cream-400 mb-1 block hover:underline w-fit"
                    >
                      {message.sender.displayName ?? `Usuario ${message.senderId}`}
                    </Link>
                  )}
                  <p>{message.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-ink-800 flex gap-2">
          <Input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
          />
          <Button type="submit">Enviar</Button>
        </form>
      </main>

      <aside className="w-56 bg-ink-900 border-l border-ink-800 p-4 overflow-y-auto">
        <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">
          Hermanos ({members.filter((m) => m.isOnline).length}/{members.length})
        </h2>
        {[...members]
          .sort((a, b) => Number(b.isOnline) - Number(a.isOnline))
          .map((member) => {
            const isSelf = member.id === ownUserId;
            const isFriend = friends.some((f) => f.id === member.id);
            const alreadySent = sentRequests.has(member.id);

            return (
              <div key={member.id} className="flex items-center gap-2 px-1 py-1.5">
                <StatusDot isOnline={member.isOnline} />
                <Link
                  to={`/perfil/${member.id}`}
                  className="text-sm text-cream-100 truncate flex-1 hover:underline"
                >
                  {member.displayName ?? `Usuario ${member.id}`}
                </Link>
                {!isSelf && !isFriend && (
                  <IconButton onClick={() => handleAddFriend(member.id)} disabled={alreadySent}>
                    {alreadySent ? 'Enviada' : '+ Amigo'}
                  </IconButton>
                )}
              </div>
            );
          })}
      </aside>
      </div>
    </div>
  );
}
