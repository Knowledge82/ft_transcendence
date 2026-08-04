import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPublicProfile } from '../api/users';
import type { PublicProfile } from '../api/users';
import { sendFriendRequest, listFriends } from '../api/friends';
import { startDirectConversation } from '../api/chat';
import { apiClient } from '../api/client';

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
    navigate(`/chat?dm=${conversation.id}`, {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <p className="text-cream-400">Cargando...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink-950 gap-4">
        <p className="text-cream-100">{error ?? 'Perfil no encontrado'}</p>
        <Link to="/chat" className="text-gold-500 hover:text-gold-400">
          ← Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-10">
      <div className="max-w-md mx-auto">
        <Link to="/chat" className="text-sm text-gold-500 hover:text-gold-400">
          ← Volver
        </Link>

        <div className="bg-ink-900 border border-ink-800 rounded-xl p-8 text-center mt-6">
          <div className="w-24 h-24 mx-auto mb-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-gold-500"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-ink-800 border-2 border-gold-500 flex items-center justify-center text-2xl text-cream-400">
                {(profile.displayName ?? '?')[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full ${
                profile.isOnline ? 'bg-green-500' : 'bg-ink-800'
              }`}
            />
            <h1 className="text-2xl font-semibold text-gold-500">
              {profile.displayName ?? `Usuario ${profile.id}`}
            </h1>
          </div>

          <p className="text-xs text-gold-500 uppercase tracking-wide mb-6">
            {profile.role}
          </p>

          <div className="flex gap-3 justify-center">
            {!isSelf && (
              <>
                <button
                  onClick={handleMessage}
                  className="bg-gold-500 text-gold-on font-medium px-4 py-2 rounded-md hover:bg-gold-400 transition-colors"
                >
                  Enviar mensaje
                </button>
                {!isFriend && (
                  <button
                    onClick={handleAddFriend}
                    disabled={requestSent}
                    className="bg-ink-800 text-cream-100 font-medium px-4 py-2 rounded-md hover:bg-ink-800/70 disabled:opacity-50 transition-colors"
                  >
                    {requestSent ? 'Solicitud enviada' : '+ Amigo'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
