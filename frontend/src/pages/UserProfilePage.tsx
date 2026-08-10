import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPublicProfile } from '../api/users';
import type { PublicProfile } from '../api/users';
import { sendFriendRequest, listFriends } from '../api/friends';
import { startDirectConversation } from '../api/chat';
import { apiClient } from '../api/client';
import { PageContainer, Card, LoadingScreen, Avatar, StatusDot, RoleBadge, Button } from '../components/ui';

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [ownUserId, setOwnUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [isFriend, setIsFriend] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getPublicProfile(Number(id)),
      listFriends(),
      apiClient.get<{ id: number }>('/users/me'),
    ])
      .then(([profileData, friends, me]) => {
        setProfile(profileData);
        setIsFriend(friends.some((f) => f.id === profileData.id));
        setOwnUserId(me.data.id);
      })
      .catch(() => setError('No se pudo encontrar a este hermano'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const isSelf = ownUserId !== null && profile !== null && ownUserId === profile.id;

  async function handleAddFriend() {
    if (!profile) return;
    try {
      await sendFriendRequest(profile.id);
      setRequestSent(true);
    } catch {
      // most likely already friends or already pending — nothing to do
    }
  }

  async function handleMessage() {
    if (!profile) return;
    const conversation = await startDirectConversation(profile.id);
    navigate(`/chat?c=${conversation.id}`, {
      state: {
        otherUser: {
          id: profile.id,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        },
      },
    });
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !profile) {
    return (
      <PageContainer className="flex flex-col items-center justify-center gap-4">
        <p className="text-cream-100">{error ?? 'Perfil no encontrado'}</p>
        <Link to="/chat" className="text-gold-500 hover:text-gold-400">
          ← Volver
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-md mx-auto">
        <Link to="/chat" className="text-sm text-gold-500 hover:text-gold-400">
          ← Volver
        </Link>

        <Card className="text-center mt-6">
          <div className="w-24 h-24 mx-auto mb-4">
            <Avatar avatarUrl={profile.avatarUrl} fallbackText={profile.displayName ?? '?'} size={96} />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <StatusDot isOnline={profile.isOnline} />
            <h1 className="text-2xl font-semibold text-gold-500">
              {profile.displayName ?? `Usuario ${profile.id}`}
            </h1>
          </div>

          <div className="mb-6">
            <RoleBadge role={profile.role} />
          </div>

          <div className="flex gap-3 justify-center">
            {!isSelf && (
              <>
                {isFriend ? (
                  <Button onClick={handleMessage}>Enviar mensaje</Button>
                ) : (
                  <Button variant="secondary" onClick={handleAddFriend} disabled={requestSent}>
                    {requestSent ? 'Solicitud enviada' : '+ Amigo'}
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
