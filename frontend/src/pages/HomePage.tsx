import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiClient } from '../api/client';
import { listFriends } from '../api/friends';
import { Footer } from '../components/Footer';
import { PageContainer, Card, LoadingScreen, Avatar, RoleBadge, Input, Button } from '../components/ui';
import { ActivityTicker } from '../components/ActivityTicker';
import { NotificationBell } from '../components/NotificationBell';
import { RandomArticles } from '../components/RandomArticles';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface Profile {
  id: number;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO';
  gender: 'MASCULINO' | 'FEMENINO';
}

export function HomePage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { socket } = useSocket();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [justChangedRole, setJustChangedRole] = useState(false);

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

  useEffect(() => {
    if (!socket) {
      return;
    }

    function handleRoleChanged({ role }: { role: Profile['role'] }) {
      setProfile((prev) => (prev ? { ...prev, role } : prev));
      setJustChangedRole(true);
      setTimeout(() => setJustChangedRole(false), 2500);
    }

    socket.on('roleChanged', handleRoleChanged);
    return () => {
      socket.off('roleChanged', handleRoleChanged);
    };
  }, [socket]);

  async function handleSaveName(event: FormEvent) {
    event.preventDefault();
    setNameError(null);

    if (nameDraft.trim().length < 2) {
      setNameError(t('home.nameTooShort'));
      return;
    }

    try {
      const { data } = await apiClient.patch<Profile>('/users/me', {
        displayName: nameDraft.trim(),
      });
      setProfile(data);
      setIsEditingName(false);
    } catch (err) {
      setNameError(t('home.nameUpdateError'));
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
      setAvatarError(t('home.avatarUploadError'));
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError(null);
    try {
      const { data } = await apiClient.delete<Profile>('/users/me/avatar');
      setProfile(data);
    } catch (err) {
      setAvatarError(t('home.avatarRemoveError'));
    }
  }

  if (isLoading || !profile) {
    return <LoadingScreen />;
  }

  return (
    <PageContainer className="flex flex-col">
      <div className="flex-1 px-4 py-10">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <LanguageSwitcher />
            <NotificationBell />
          </div>
          <ActivityTicker />
          <RandomArticles />
          <Card className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <Avatar avatarUrl={profile.avatarUrl} fallbackText={profile.displayName ?? profile.email} size={96} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gold-500 text-gold-on text-xs flex items-center justify-center hover:bg-gold-400 disabled:opacity-50"
              title={t('home.changeAvatar')}
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
          {isUploadingAvatar && <p className="text-xs text-cream-400 mb-2">{t('home.uploading')}</p>}
          {avatarError && <p className="text-xs text-error-500 mb-2">{avatarError}</p>}
          {profile.avatarUrl && !isUploadingAvatar && (
            <button
              onClick={handleRemoveAvatar}
              className="text-xs text-cream-400 hover:text-error-500 transition-colors mb-2"
            >
              {t('home.removeAvatar')}
            </button>
          )}

          {isEditingName ? (
            <form onSubmit={handleSaveName} className="mb-2">
              <Input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
                className="text-center"
              />
              <div className="flex justify-center gap-2 mt-2">
                <button type="submit" className="text-xs text-gold-500 hover:text-gold-400">
                  {t('common.save')}
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
                  {t('common.cancel')}
                </button>
              </div>
              {nameError && <p className="text-xs text-error-500 mt-1">{nameError}</p>}
            </form>
          ) : (
            <h1
              onClick={() => setIsEditingName(true)}
              className="text-2xl font-semibold text-gold-500 mb-1 cursor-pointer hover:underline"
              title={t('home.editNameHint')}
            >
              {profile.displayName ?? t('home.noName')}
            </h1>
          )}

          <p className="text-sm text-cream-400 mb-2">{profile.email}</p>
          <div
            className={`mb-6 inline-block rounded transition-shadow ${
              justChangedRole ? 'animate-[pulse-glow_0.8s_ease-in-out_2]' : ''
            }`}
          >
            <RoleBadge role={profile.role} gender={profile.gender} />
          </div>

          <div className="flex justify-center gap-8 mb-6">
            <div>
              <p className="text-xl text-gold-500 font-semibold">{friendCount}</p>
              <p className="text-xs text-cream-400">{t('home.friends')}</p>
            </div>
            <div>
              <p className="text-xl text-gold-500 font-semibold">{onlineCount}</p>
              <p className="text-xs text-cream-400">{t('home.online')}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/chat"
              className="bg-gold-500 text-gold-on font-medium px-4 py-2 rounded-md hover:bg-gold-400 transition-colors"
            >
              {t('home.goToChat')}
            </Link>
            <Link
              to="/confesionario"
              className="bg-gold-500 text-gold-on font-medium px-4 py-2 rounded-md hover:bg-gold-400 transition-colors"
            >
              {t('home.confessional')}
            </Link>
            <Link
              to="/biblioteca"
              className="bg-ink-800 text-gold-500 font-medium px-4 py-2 rounded-md hover:bg-ink-800/70 transition-colors"
            >
              {t('home.library')}
            </Link>
            {profile.role === 'ARZOBISPO' && (
              <Link
                to="/santuario"
                className="bg-ink-800 text-gold-500 font-medium px-4 py-2 rounded-md hover:bg-ink-800/70 transition-colors"
              >
                {t('home.sanctuary')}
              </Link>
            )}
            <Button variant="secondary" onClick={() => logout()}>
              {t('home.logout')}
            </Button>
          </div>
        </Card>
        </div>
      </div>
      <Footer />
    </PageContainer>
  );
}
