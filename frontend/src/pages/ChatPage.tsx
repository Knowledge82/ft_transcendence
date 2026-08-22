import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getGeneralChannel, startDirectConversation, getMessageHistory, getGeneralMembers, getDirectConversations, uploadAttachment, deleteMessage, withAuthToken } from '../api/chat';
import type { Conversation, Message, Member, DirectConversationSummary } from '../api/chat';
import { listFriends, sendFriendRequest, listPendingRequests, acceptFriendRequest, removeFriend } from '../api/friends';
import type { Friend, PendingRequest } from '../api/friends';
import { apiClient } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { LoadingScreen, StatusDot, IconButton, Input, Button, PageContainer, BackLink } from '../components/ui';
import { ROUTES } from '../routes';
import { getGenderedRole } from '../utils/genderedRole';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useConfirm } from '../context/ConfirmContext';

const MAX_MESSAGE_LENGTH = 500;

type MobileView = 'list' | 'chat' | 'members';

function renderMessage(message: string) {
  const parts = message.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={i} className="text-gold-500 font-semibold">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatPage() {
  const { t, i18n } = useTranslation();
  const { socket } = useSocket();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [mobileView, setMobileView] = useState<MobileView>('list');

  const [generalChannel, setGeneralChannel] = useState<Conversation | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [directConversations, setDirectConversations] = useState<DirectConversationSummary[]>([]);
  const [activeDmTarget, setActiveDmTarget] = useState<{
    id: number;
    displayName: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [activeOrganization, setActiveOrganization] = useState<{
    id: number;
    name: string;
    color: string;
  } | null>(null);
  const [ownOrganization, setOwnOrganization] = useState<{
    id: number;
    name: string;
    color: string;
    conversation: { id: number } | null;
  } | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemAnnouncements, setSystemAnnouncements] = useState<{ id: string; text: string }[]>(
    [],
  );
  const [draft, setDraft] = useState('');
  const [ownUserId, setOwnUserId] = useState<number | null>(null);
  const [ownDisplayName, setOwnDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  function userFallback(id: number | undefined) {
    return `${t('common.user')} ${id}`;
  }

  const headerLabel = activeDmTarget
    ? activeDmTarget.displayName ?? userFallback(activeDmTarget.id)
    : activeOrganization
    ? activeOrganization.name
    : t('chat.generalChannel');

  useEffect(() => {
    Promise.all([
      getGeneralChannel(),
      listFriends(),
      getGeneralMembers(),
      listPendingRequests(),
      getDirectConversations(),
      apiClient.get<{
        id: number;
        displayName: string | null;
        role: string;
        organizationMembership: {
          organization: {
            id: number;
            name: string;
            color: string;
            conversation: { id: number } | null;
          };
        } | null;
      }>('/users/me'),
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

        const myOrg = me.data.organizationMembership?.organization ?? null;
        setOwnOrganization(myOrg);

        const cParam = searchParams.get('c');
        const cId = cParam ? Number(cParam) : null;
        const stateOtherUser = (location.state as { otherUser?: typeof activeDmTarget })
          ?.otherUser;

        if (cId === general.id) {
          setSelectedConversationId(general.id);
          if (cId) setMobileView('chat');
        } else if (myOrg?.conversation && cId === myOrg.conversation.id) {
          setSelectedConversationId(cId);
          setActiveOrganization({ id: myOrg.id, name: myOrg.name, color: myOrg.color });
          setMobileView('chat');
        } else if (cId) {
          const matchingDm = directList.find((c) => c.id === cId);
          if (matchingDm) {
            setSelectedConversationId(matchingDm.id);
            setActiveDmTarget(matchingDm.otherUser);
            setMobileView('chat');
          } else if (stateOtherUser) {
            setSelectedConversationId(cId);
            setActiveDmTarget(stateOtherUser);
            setMobileView('chat');
          } else {
            setSelectedConversationId(general.id);
          }
        } else {
          setSelectedConversationId(general.id);
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

    function handleMessageUpdated(updated: Message) {
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    }

    function handleArzobispoPresence(data: { gender: string; isOnline: boolean }) {
      const namespace = data.isOnline ? 'arzobispoOnline' : 'arzobispoOffline';
      const variantIndex = Math.floor(Math.random() * 3);
      const genderedRole = getGenderedRole('ARZOBISPO', data.gender, i18n.language);
      const text = t(`chat.${namespace}.${variantIndex}`, { role: genderedRole });
      setSystemAnnouncements((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, text }]);
    }

    socket.on('newMessage', handleNewMessage);
    socket.on('userStatusChanged', handleStatusChanged);
    socket.on('memberJoined', handleMemberJoined);
    socket.on('friendRequestReceived', handleFriendRequestReceived);
    socket.on('friendRequestAccepted', handleFriendRequestAccepted);
    socket.on('messageUpdated', handleMessageUpdated);
    socket.on('arzobispoPresenceChanged', handleArzobispoPresence);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userStatusChanged', handleStatusChanged);
      socket.off('memberJoined', handleMemberJoined);
      socket.off('friendRequestReceived', handleFriendRequestReceived);
      socket.off('friendRequestAccepted', handleFriendRequestAccepted);
      socket.off('messageUpdated', handleMessageUpdated);
      socket.off('arzobispoPresenceChanged', handleArzobispoPresence);
    };
  }, [socket, selectedConversationId, i18n.language]);

  function selectConversation(
    id: number,
    dmTarget: typeof activeDmTarget,
    org: typeof activeOrganization = null,
  ) {
    setSelectedConversationId(id);
    setActiveDmTarget(dmTarget);
    setActiveOrganization(org);
    setSearchParams({ c: String(id) }, { replace: true });
    setMobileView('chat');
  }

  function handleMobileBack() {
    setMobileView(mobileView === 'members' ? 'chat' : 'list');
  }

  async function openDirectConversation(friend: Friend) {
    const conversation = await startDirectConversation(friend.id);
    selectConversation(conversation.id, {
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
    if (!(await confirm(t('chat.confirmRemoveFriend')))) {
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
        t('chat.uploadError');
      setUploadError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDeleteMessage(messageId: number) {
    if (!(await confirm(t('chat.confirmDeleteMessage')))) {
      return;
    }
    const updated = await deleteMessage(messageId);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
  }

  const isModerator = ownRole === 'INQUISIDOR' || ownRole === 'ARZOBISPO';
  const isDirectConversationSelected = activeDmTarget !== null;

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
    <PageContainer className="flex flex-col h-screen overflow-hidden" showFrame={false}>
      <header className="flex-shrink-0 grid grid-cols-3 items-center px-4 py-2 bg-ink-900 border-b border-border-default">
        <div className="flex items-center gap-2">
          {mobileView !== 'list' && (
            <button
              onClick={handleMobileBack}
              className="md:hidden text-cream-100 text-xl inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ms-2"
              aria-label={t('common.back')}
            >
              <span aria-hidden="true" className="rtl:scale-x-[-1]">←</span>
            </button>
          )}
          <div className={mobileView === 'list' ? 'block' : 'hidden md:block'}>
            <LanguageSwitcher />
          </div>
        </div>
        <h1 className="text-sm text-gold-500 font-medium text-center truncate px-1">
          {headerLabel}
        </h1>
        <div className="flex items-center justify-end gap-2">
          {mobileView === 'chat' && !activeDmTarget && (
            <button
              onClick={() => setMobileView('members')}
              className="md:hidden text-cream-100 text-lg inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label={t('chat.showMembers')}
              title={t('chat.showMembers')}
            >
              👥
            </button>
          )}
          <span className="hidden md:inline text-sm text-cream-400">
            {t('chat.loggedInAs')}{' '}
            <span className="text-gold-500 font-medium">
              {ownDisplayName ?? userFallback(ownUserId ?? undefined)}
            </span>
          </span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
      <aside
        className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-64 bg-ink-900 border-e border-border-default flex-col overflow-y-auto`}
      >
        <div className="p-4 border-b border-border-default">
          <BackLink to={ROUTES.HOME} />
        </div>

        <div className="p-4">
          <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">{t('chat.channels')}</h2>
          {generalChannel && (
            <button
              onClick={() => generalChannel && selectConversation(generalChannel.id, null)}
              className={`w-full text-start px-3 py-2 rounded-md mb-1 transition-colors ${
                selectedConversationId === generalChannel.id
                  ? 'bg-gold-500 text-gold-on'
                  : 'text-cream-100 hover:bg-ink-800'
              }`}
            >
              {t('chat.generalChannel')}
            </button>
          )}
          {ownOrganization?.conversation && (
            <button
              onClick={() =>
                selectConversation(ownOrganization.conversation!.id, null, {
                  id: ownOrganization.id,
                  name: ownOrganization.name,
                  color: ownOrganization.color,
                })
              }
              className={`w-full flex items-center gap-2 text-start px-3 py-2 rounded-md mb-1 transition-colors ${
                selectedConversationId === ownOrganization.conversation.id
                  ? 'bg-gold-500 text-gold-on'
                  : 'text-cream-100 hover:bg-ink-800'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: ownOrganization.color }}
                aria-hidden="true"
              />
              <span className="truncate">{ownOrganization.name}</span>
            </button>
          )}
        </div>

        {directConversations.length > 0 && (
          <div className="p-4 border-t border-border-default">
            <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">
              {t('chat.conversations')}
            </h2>
            {directConversations.map((conv) => {
              const label = conv.otherUser?.displayName ?? userFallback(conv.otherUser?.id);
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id, conv.otherUser)}
                  className={`w-full flex items-center gap-2 text-start px-3 py-2 rounded-md mb-1 transition-colors ${
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
          <div className="p-4 border-t border-border-default">
            <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">
              {t('chat.pendingRequests')}
            </h2>
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-2 mb-1">
                <Link
                  to={`/perfil/${request.requesterId}`}
                  className="text-sm text-cream-100 truncate hover:underline"
                >
                  {request.requester.displayName ?? userFallback(request.requesterId)}
                </Link>
                <div className="flex gap-1 flex-shrink-0">
                  <IconButton onClick={() => handleAcceptRequest(request.requesterId)}>
                    {t('chat.accept')}
                  </IconButton>
                  <IconButton
                    tone="danger"
                    onClick={() => handleRejectRequest(request.requesterId)}
                  >
                    {t('chat.reject')}
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4">
          <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">{t('home.friends')}</h2>
          {friends.length === 0 && (
            <p className="text-sm text-cream-400">{t('chat.noFriendsYet')}</p>
          )}
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-2 px-1 py-1 rounded-md mb-1 hover:bg-ink-800 transition-colors"
            >
              <StatusDot isOnline={friend.isOnline} />
              {/* Tapping the name itself opens the DM — replaces the
                  separate ✉ icon button, which was cramped right next
                  to the ✕ one and, like it, had no explicit touch
                  target size at all */}
              <button
                onClick={() => openDirectConversation(friend)}
                title={t('chat.sendMessage')}
                className="flex-1 min-w-0 min-h-[44px] flex items-center text-start text-sm text-cream-100 truncate hover:text-gold-500 transition-colors"
              >
                <span className="truncate">{friend.displayName ?? userFallback(friend.id)}</span>
              </button>
              <IconButton
                tone="danger"
                onClick={() => handleRemoveFriend(friend.id)}
                title={t('chat.removeFriend')}
                aria-label={t('chat.removeFriend')}
                className="min-w-[44px] min-h-[44px] flex-shrink-0"
              >
                ✕
              </IconButton>
            </div>
          ))}
        </div>
      </aside>

      <main
        className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0`}
      >
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((message) => {
            const isOwn = message.senderId === ownUserId;
            const isDeleted = message.deletedAt !== null;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-xs rounded-lg px-3 py-2 relative ${
                    isDeleted
                      ? 'bg-ink-950 border border-border-default text-cream-400 italic'
                      : isOwn
                      ? 'bg-gold-500 text-gold-on'
                      : 'bg-ink-900 text-cream-100'
                  }`}
                >
                  {!isOwn && !isDeleted && (
                    <Link
                      to={`/perfil/${message.senderId}`}
                      className="text-xs text-cream-400 mb-1 block hover:underline w-fit"
                    >
                      {message.sender.displayName ?? userFallback(message.senderId)}
                    </Link>
                  )}

                  {isDeleted ? (
                    <p className="text-sm">
                      🔥 {t('chat.heresyDeletedBy')}{' '}
                      {message.deletedBy
                        ? getGenderedRole(message.deletedBy.role, message.deletedBy.gender, i18n.language)
                        : '???'}{' '}
                      <span className="text-gold-500 font-semibold not-italic">
                        {message.deletedBy?.displayName ?? t('chat.anInquisitor')}
                      </span>
                    </p>
                  ) : (
                    <>
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
                                alt={message.attachmentName ?? t('chat.attachment')}
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
                              📄 {message.attachmentName ?? t('chat.document')}
                            </a>
                          )}
                        </div>
                      )}

                      {message.content && <p>{message.content}</p>}
                    </>
                  )}

                  {isModerator && !isDeleted && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      title={t('chat.flagHeresy')}
                      aria-label={t('chat.flagHeresy')}
                      className={`absolute -top-2 ${
                        isOwn ? '-start-2' : '-end-2'
                      } w-11 h-11 rounded-full bg-ink-950 border border-border-default text-error-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {selectedConversationId === generalChannel?.id &&
            systemAnnouncements.map((announcement) => (
              <p key={announcement.id} className="text-center text-xs text-cream-400 italic py-1">
                {renderMessage(announcement.text)}
              </p>
            ))}
          <div ref={bottomRef} />
        </div>

        {uploadError && (
          <div role="alert" className="px-4 pt-3">
            <p className="text-sm text-error-500">{uploadError}</p>
          </div>
        )}

        {pendingAttachment && (
          <div className="px-4 pt-3 flex items-center gap-2 text-sm text-cream-100">
            <span className="bg-ink-900 border border-border-default rounded-md px-2 py-1 truncate max-w-xs">
              📎 {pendingAttachment.name}
            </span>
            <button
              onClick={() => setPendingAttachment(null)}
              className="text-error-500 hover:text-red-400 text-xs"
            >
              {t('chat.removeAttachment')}
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

        <div className="px-4 pt-2 text-end">
          <span className="text-xs text-cream-400" dir="ltr">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>

        <form onSubmit={handleSend} className="p-4 pt-1 border-t border-border-default flex gap-2">
          {isDirectConversationSelected && (
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
                title={t('chat.attachFile')}
                aria-label={t('chat.attachFile')}
                className="text-cream-400 hover:text-gold-500 transition-colors inline-flex items-center justify-center min-w-[44px] min-h-[44px] flex-shrink-0"
              >
                📎
              </button>
            </>
          )}
          <Input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder={t('chat.messagePlaceholder')}
            maxLength={MAX_MESSAGE_LENGTH}
            className="flex-1 min-w-0"
          />
          <Button type="submit" className="flex-shrink-0">{t('chat.send')}</Button>
        </form>
      </main>

      <aside
        className={`${mobileView === 'members' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-56 bg-ink-900 border-s border-border-default p-4 overflow-y-auto`}
      >
        <h2 className="text-xs uppercase tracking-wide text-cream-400 mb-2">
          {t('chat.membersHeader', {
            online: members.filter((m) => m.isOnline).length,
            total: members.length,
          })}
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
                  {member.displayName ?? userFallback(member.id)}
                </Link>
                {!isSelf && !isFriend && (
                  <IconButton onClick={() => handleAddFriend(member.id)} disabled={alreadySent}>
                    {alreadySent ? t('chat.requestSent') : t('chat.addFriend')}
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
