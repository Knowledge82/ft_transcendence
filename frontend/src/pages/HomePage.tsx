import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { listFriends } from '../api/friends';
import { Footer } from '../components/Footer';

interface Profile {
  id: number;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'HERMANO' | 'GUARDIAN' | 'ARZOBISPO';
}

export function HomePage() {
  const { logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<Profile>('/users/me'),
      listFriends(),
    ]).then(([me, friends]) => {
      setProfile(me.data);
      setNameDraft(me.data.displayName ?? '');
      setFriendCount(friends.length);
      setOnlineCount(friends.filter((f) => f.isOnline).length);
      setIsLoading(false);
    });
  }, []);

  async function handleSaveName(event: FormEvent) {
    event.preventDefault();
    setNameError(null);

    if (nameDraft.trim().length < 2) {
      setNameError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    try {
      const { data } = await apiClient.patch<Profile>('/users/me', {
        displayName: nameDraft.trim(),
      });
      setProfile(data);
      setIsEditingName(false);
    } catch (err) {
      setNameError('No se pudo actualizar el nombre');
    }
  }

  async function handleAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarError(null);
    setIsUploadingAvatar(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await apiClient.post<Profile>('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(data);
    } catch (err) {
      setAvatarError('No se pudo subir la imagen (¿formato o tamaño no válidos?)');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <p className="text-cream-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="bg-ink-900 border border-ink-800 rounded-xl p-8 text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-gold-500"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-ink-800 border-2 border-gold-500 flex items-center justify-center text-2xl text-cream-400">
                {(profile.displayName ?? profile.email)[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gold-500 text-gold-on text-xs flex items-center justify-center hover:bg-gold-400 disabled:opacity-50"
              title="Cambiar avatar"
            >
              ✎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelected}
              className="hidden"
            />
          </div>
          {isUploadingAvatar && <p className="text-xs text-cream-400 mb-2">Subiendo...</p>}
          {avatarError && <p className="text-xs text-error-500 mb-2">{avatarError}</p>}

          {isEditingName ? (
            <form onSubmit={handleSaveName} className="mb-2">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
                className="text-center bg-ink-950 border border-ink-800 rounded-md px-2 py-1 text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <div className="flex justify-center gap-2 mt-2">
                <button type="submit" className="text-xs text-gold-500 hover:text-gold-400">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setNameDraft(profile.displayName ?? '');
                    setNameError(null);
                  }}
                  className="text-xs text-cream-400 hover:text-cream-100"
                >
                  Cancelar
                </button>
              </div>
              {nameError && <p className="text-xs text-error-500 mt-1">{nameError}</p>}
            </form>
          ) : (
            <h1
              onClick={() => setIsEditingName(true)}
              className="text-2xl font-semibold text-gold-500 mb-1 cursor-pointer hover:underline"
              title="Haz clic para editar"
            >
              {profile.displayName ?? 'Sin nombre'}
            </h1>
          )}

          <p className="text-sm text-cream-400 mb-2">{profile.email}</p>
          <p className="text-xs text-gold-500 uppercase tracking-wide mb-6">
            {profile.role}
          </p>

          <div className="flex justify-center gap-8 mb-6">
            <div>
              <p className="text-xl text-gold-500 font-semibold">{friendCount}</p>
              <p className="text-xs text-cream-400">Hermanos</p>
            </div>
            <div>
              <p className="text-xl text-gold-500 font-semibold">{onlineCount}</p>
              <p className="text-xs text-cream-400">En línea</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/chat"
              className="bg-gold-500 text-gold-on font-medium px-4 py-2 rounded-md hover:bg-gold-400 transition-colors"
            >
              Ir al chat
            </Link>
            <Link
              to="/confesionario"
              className="bg-gold-500 text-gold-on font-medium px-4 py-2 rounded-md hover:bg-gold-400 transition-colors"
            >
              El Confesionario
            </Link>
            {profile.role === 'ARZOBISPO' && (
              <Link
                to="/santuario"
                className="bg-ink-800 text-gold-500 font-medium px-4 py-2 rounded-md hover:bg-ink-800/70 transition-colors"
              >
                Santuario
              </Link>
            )}
            <button
              onClick={() => logout()}
              className="bg-ink-800 text-cream-100 font-medium px-4 py-2 rounded-md hover:bg-ink-800/70 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
