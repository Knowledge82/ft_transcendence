import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { getGeneralChannel, startDirectConversation, getMessageHistory, getGeneralMembers, getDirectConversations, uploadAttachment, deleteMessage, withAuthToken } from '../api/chat';
import type { Conversation, Message, Member, DirectConversationSummary } from '../api/chat';
import { listFriends, sendFriendRequest, listPendingRequests, acceptFriendRequest, removeFriend } from '../api/friends';
import type { Friend, PendingRequest } from '../api/friends';
import { apiClient } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { LoadingScreen, StatusDot, IconButton, Input, Button, PageContainer, BackLink } from '../components/ui';
import { ROUTES } from '../routes';

export function ChatPage() {
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [channelLabel, setChannelLabel] = useState('Capítulo');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [ownUserId, setOwnUserId] = useState<number | null>(null);
  const [ownDisplayName, setOwnDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attachment upload state — pendingAttachment holds the file's metadata
  // AFTER it's already uploaded to the server (has a filename/type/name),
  // ready to be attached to the next message sent
  const [pendingAttachment, setPendingAttachment] = useState<{
    filename: string;
    type: string;
    name: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ownRole, setOwnRole] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      getGeneralChannel(),
      listFriends(),
      getGeneralMembers(),
      listPendingRequests(),
      getDirectConversations(),
      apiClient.get<{ id: number; displayName: string | null; role: string }>('/users/me'),
    ])
      .then(([general, friendsList, membersList, pending, directList, me]) => {
        setGeneralChannel(general);
        setFriends(friendsList);
        setMembers(membersList);
        setPendingRequests(pending);
        setDirectConversations(directList);
        setOwnUserId(me.data.id);
        setOwnDisplayName(me.data.displayName);
        setOwnRole(me.data.role);

        const cParam = searchParams.get('c');
        const cId = cParam ? Number(cParam) : null;
        const stateOtherUser = (location.state as { otherUser?: typeof activeDmTarget })
          ?.otherUser;

        if (cId === general.id) {
          setSelectedConversationId(general.id);
          setChannelLabel('Capítulo');
        } else if (cId) {
          const matchingDm = directList.find((c) => c.id === cId);
          if (matchingDm) {
            setSelectedConversationId(matchingDm.id);
            setChannelLabel(
              matchingDm.otherUser?.displayName ?? `Usuario ${matchingDm.otherUser?.id}`,
            );
            setActiveDmTarget(matchingDm.otherUser);
          } else if (stateOtherUser) {
            // Brand new conversation, not in directList yet (no messages
            // sent so far) — we still know who it's with because
            // UserProfilePage passed it along via navigation state
            setSelectedConversationId(cId);
            setChannelLabel(stateOtherUser.displayName ?? `Usuario ${stateOtherUser.id}`);
            setActiveDmTarget(stateOtherUser);
          } else {
            // ?c= points to a conversation we have no information about
            // (e.g. a stale/invalid link) — fall back safely to the general channel
            setSelectedConversationId(general.id);
            setChannelLabel('Capítulo');
          }
        } else {
          setSelectedConversationId(general.id);
          setChannelLabel('Capítulo');
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

    function handleMessageDeleted({ messageId }: { messageId: number }) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }

    socket.on('newMessage', handleNewMessage);
    socket.on('userStatusChanged', handleStatusChanged);
    socket.on('memberJoined', handleMemberJoined);
    socket.on('friendRequestReceived', handleFriendRequestReceived);
    socket.on('friendRequestAccepted', handleFriendRequestAccepted);
    socket.on('messageDeleted', handleMessageDeleted);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userStatusChanged', handleStatusChanged);
      socket.off('memberJoined', handleMemberJoined);
      socket.off('friendRequestReceived', handleFriendRequestReceived);
      socket.off('friendRequestAccepted', handleFriendRequestAccepted);
      socket.off('messageDeleted', handleMessageDeleted);
    };
  }, [socket, selectedConversationId]);

  // Central place that changes which conversation is selected — updates
  // all the related state AND syncs the URL (?c=<id>) in one call, so
  // every click handler doesn't have to remember to do both. `replace:
  // true` avoids spamming the browser's back-button history with every
  // single conversation switch.
  function selectConversation(
    id: number,
    label: string,
    dmTarget: typeof activeDmTarget,
  ) {
    setSelectedConversationId(id);
    setChannelLabel(label);
    setActiveDmTarget(dmTarget);
    setSearchParams({ c: String(id) }, { replace: true });
  }

  async function openDirectConversation(friend: Friend) {
    const conversation = await startDirectConversation(friend.id);
    selectConversation(conversation.id, friend.displayName ?? `Usuario ${friend.id}`, {
      id: friend.id,
      displayName: friend.displayName,
      avatarUrl: friend.avatarUrl,
    });
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

  async function handleRejectRequest(requesterId: number) {
    await removeFriend(requesterId);
    setPendingRequests((prev) => prev.filter((r) => r.requesterId !== requesterId));
  }

  async function handleRemoveFriend(userId: number) {
    if (!confirm('¿Seguro que quieres quitar a este hermano de tu lista de amigos?')) {
      return;
    }
    await removeFriend(userId);
    setFriends((prev) => prev.filter((f) => f.id !== userId));
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploadProgress(0);
    setUploadError(null);
    try {
      const uploaded = await uploadAttachment(file, setUploadProgress);
      setPendingAttachment(uploaded);
    } catch (err) {
      console.error('No se pudo subir el archivo:', err);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo subir el archivo.';
      setUploadError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDeleteMessage(messageId: number) {
    if (!confirm('¿Eliminar este mensaje?')) {
      return;
    }
    await deleteMessage(messageId);
    // No need to update local state here — the 'messageDeleted' socket
    // event (received by everyone, including ourselves) already does it
  }

  const isModerator = ownRole === 'GUARDIAN' || ownRole === 'ARZOBISPO';
  const isGeneralChannelSelected =
    generalChannel !== null && selectedConversationId === generalChannel.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages]);

  function handleSend(event: FormEvent) {
    event.preventDefault();
    if ((!draft.trim() && !pendingAttachment) || !selectedConversationId || !socket) {
      return;
    }
    socket.emit('sendMessage', {
      conversationId: selectedConversationId,
      content: draft.trim(),
      attachmentFilename: pendingAttachment?.filename,
      attachmentType: pendingAttachment?.type,
      attachmentName: pendingAttachment?.name,
    });
    setDraft('');
    setPendingAttachment(null);

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
    <PageContainer className="flex flex-col" showFrame={false}>
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
          <BackLink to={ROUTES.HOME} />
        </div>

        <div className="p-4">
          <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">Canales</h2>
          {generalChannel && (
            <button
              onClick={() => generalChannel && selectConversation(generalChannel.id, 'Capítulo', null)}
              className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                selectedConversationId === generalChannel.id
                  ? 'bg-gold-500 text-gold-on'
                  : 'text-cream-100 hover:bg-ink-800'
              }`}
            >
              Capítulo
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
                  onClick={() => selectConversation(conv.id, label, conv.otherUser)}
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
                <div className="flex gap-1 flex-shrink-0">
                  <IconButton onClick={() => handleAcceptRequest(request.requesterId)}>
                    Aceptar
                  </IconButton>
                  <IconButton
                    tone="danger"
                    onClick={() => handleRejectRequest(request.requesterId)}
                  >
                    Rechazar
                  </IconButton>
                </div>
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
            const canDelete = isOwn || isModerator;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
              >
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 relative ${
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

                  {message.attachmentUrl && (
                    <div className="mb-2">
                      {message.attachmentType?.startsWith('image/') ? (
                        <a
                          href={withAuthToken(message.attachmentUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={withAuthToken(message.attachmentUrl)}
                            alt={message.attachmentName ?? 'Adjunto'}
                            className="rounded-md max-h-48 object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          href={withAuthToken(message.attachmentUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2 text-sm underline ${
                            isOwn ? 'text-gold-on' : 'text-gold-500'
                          }`}
                        >
                          📄 {message.attachmentName ?? 'Documento'}
                        </a>
                      )}
                    </div>
                  )}

                  {message.content && <p>{message.content}</p>}

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      title="Eliminar mensaje"
                      className={`absolute -top-2 ${
                        isOwn ? '-left-2' : '-right-2'
                      } w-5 h-5 rounded-full bg-ink-950 border border-ink-800 text-error-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {uploadError && (
          <div className="px-4 pt-3">
            <p className="text-sm text-error-500">{uploadError}</p>
          </div>
        )}

        {pendingAttachment && (
          <div className="px-4 pt-3 flex items-center gap-2 text-sm text-cream-100">
            <span className="bg-ink-900 border border-ink-800 rounded-md px-2 py-1 truncate max-w-xs">
              📎 {pendingAttachment.name}
            </span>
            <button
              onClick={() => setPendingAttachment(null)}
              className="text-error-500 hover:text-red-400 text-xs"
            >
              Quitar
            </button>
          </div>
        )}

        {uploadProgress !== null && (
          <div className="px-4 pt-2">
            <div className="w-full h-1 bg-ink-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-500 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="p-4 border-t border-ink-800 flex gap-2">
          {!isGeneralChannelSelected && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar archivo"
                className="text-cream-400 hover:text-gold-500 transition-colors px-2"
              >
                📎
              </button>
            </>
          )}
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
    </PageContainer>
  );
}
