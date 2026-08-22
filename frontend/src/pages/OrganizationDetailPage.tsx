import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  joinOrganization,
  leaveOrganization,
  removeOrganizationMember,
  uploadOrganizationBanner,
  removeOrganizationBanner,
} from '../api/organizations';
import type { OrganizationDetail } from '../api/organizations';
import { getOrganizationArticles } from '../api/articles';
import type { Article } from '../api/articles';
import { apiClient } from '../api/client';
import { ROUTES } from '../routes';
import {
  PageContainer,
  Card,
  LoadingScreen,
  BackLink,
  Avatar,
  IconButton,
  Textarea,
  Input,
  Button,
} from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { getGenderedRole } from '../utils/genderedRole';
import { useConfirm } from '../context/ConfirmContext';
import { translateApiError } from '../utils/apiErrors';

const MAX_MANIFESTO_LENGTH = 1000;
const MAX_NAME_LENGTH = 50;

export function OrganizationDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [ownUserId, setOwnUserId] = useState<number | null>(null);
  const [ownRole, setOwnRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isEditingManifesto, setIsEditingManifesto] = useState(false);
  const [manifestoDraft, setManifestoDraft] = useState('');
  const [isSavingManifesto, setIsSavingManifesto] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [colorDraft, setColorDraft] = useState('#c0392b');
  const [isSavingName, setIsSavingName] = useState(false);

  const [isJoining, setIsJoining] = useState(false);

  const [orgArticles, setOrgArticles] = useState<Article[]>([]);

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  function loadOrg(orgId: number) {
    return getOrganizationById(orgId).then((data) => {
      setOrg(data);
      setManifestoDraft(data.manifesto ?? '');
      setNameDraft(data.name);
      setColorDraft(data.color);
    });
  }

  useEffect(() => {
    if (!id) return;
    Promise.all([loadOrg(Number(id)), apiClient.get<{ id: number; role: string }>('/users/me')])
      .then(([, me]) => {
        setOwnUserId(me.data.id);
        setOwnRole(me.data.role);
      })
      .catch(() => setLoadError(t('organizations.notFound')))
      .finally(() => setIsLoading(false));
  }, [id]);

  const isArzobispo = ownRole === 'ARZOBISPO';
  const ownMembership = org?.members.find((m) => m.user.id === ownUserId) ?? null;
  const isMember = ownMembership !== null;
  const isOwnLeader = ownMembership?.isLeader ?? false;
  const canManage = isArzobispo || isOwnLeader;
  const canWriteArticle = isArzobispo || (ownRole === 'INQUISIDOR' && isMember);
  const canViewArticles = isArzobispo || isMember;

  useEffect(() => {
    if (!org || !canViewArticles) {
      return;
    }
    getOrganizationArticles(org.id)
      .then(setOrgArticles)
      .catch(() => setOrgArticles([]));
  }, [org?.id, canViewArticles]);

  function handleApiError(err: unknown, fallbackKey: string) {
    const data = (err as { response?: { data?: { code?: string } } })?.response?.data;
    setActionError(translateApiError(data, t, t(fallbackKey)));
  }

  async function handleSaveManifesto() {
    if (!org) return;
    setIsSavingManifesto(true);
    setActionError(null);
    try {
      await updateOrganization(org.id, { manifesto: manifestoDraft.trim() });
      await loadOrg(org.id);
      setIsEditingManifesto(false);
    } catch (err) {
      handleApiError(err, 'organizations.updateError');
    } finally {
      setIsSavingManifesto(false);
    }
  }

  async function handleSaveName() {
    if (!org) return;
    setIsSavingName(true);
    setActionError(null);
    try {
      await updateOrganization(org.id, { name: nameDraft.trim(), color: colorDraft });
      await loadOrg(org.id);
      setIsEditingName(false);
    } catch (err) {
      handleApiError(err, 'organizations.updateError');
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleJoin() {
    if (!org) return;
    setIsJoining(true);
    setActionError(null);
    try {
      await joinOrganization(org.id);
      await loadOrg(org.id);
    } catch (err) {
      handleApiError(err, 'organizations.joinError');
    } finally {
      setIsJoining(false);
    }
  }

  async function handleLeave() {
    if (!org) return;
    if (!(await confirm(t('organizations.confirmLeave')))) {
      return;
    }
    await leaveOrganization();
    await loadOrg(org.id);
  }

  async function handleRemoveMember(userId: number) {
    if (!org) return;
    if (!(await confirm(t('organizations.confirmRemoveMember')))) {
      return;
    }
    try {
      await removeOrganizationMember(org.id, userId);
      await loadOrg(org.id);
    } catch (err) {
      handleApiError(err, 'organizations.updateError');
    }
  }

  async function handleDelete() {
    if (!org) return;
    if (!(await confirm(t('organizations.confirmDelete')))) {
      return;
    }
    await deleteOrganization(org.id);
    navigate(ROUTES.ORGANIZATIONS);
  }

  async function handleBannerSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !org) {
      return;
    }
    setActionError(null);
    setIsUploadingBanner(true);
    try {
      await uploadOrganizationBanner(org.id, file);
      await loadOrg(org.id);
    } catch (err) {
      handleApiError(err, 'organizations.bannerUploadError');
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  }

  async function handleRemoveBanner() {
    if (!org) return;
    try {
      await removeOrganizationBanner(org.id);
      await loadOrg(org.id);
    } catch (err) {
      handleApiError(err, 'organizations.updateError');
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (loadError || !org) {
    return (
      <PageContainer className="flex flex-col items-center justify-center gap-4">
        <p className="text-cream-100">{loadError ?? t('organizations.notFound')}</p>
        <BackLink to={ROUTES.ORGANIZATIONS} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <BackLink to={ROUTES.ORGANIZATIONS} />
          <LanguageSwitcher />
        </div>

        {(org.bannerUrl || canManage) && (
          <div className="mt-6">
            {org.bannerUrl ? (
              <div
                className="relative w-full h-48 rounded-xl bg-cover bg-center"
                style={{ backgroundImage: `url(${org.bannerUrl})` }}
              >
                {canManage && (
                  <div className="absolute bottom-2 end-2 flex gap-2">
                    <button
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={isUploadingBanner}
                      className="text-xs bg-ink-950/80 text-gold-500 px-2 py-1 rounded-md hover:bg-ink-950 disabled:opacity-50"
                    >
                      {isUploadingBanner ? t('home.uploading') : t('organizations.changeBanner')}
                    </button>
                    <button
                      onClick={handleRemoveBanner}
                      className="text-xs bg-ink-950/80 text-error-500 px-2 py-1 rounded-md hover:bg-ink-950"
                    >
                      {t('organizations.removeBanner')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={isUploadingBanner}
                className="w-full h-24 rounded-xl border-2 border-dashed border-border-default text-cream-400 hover:border-gold-500 hover:text-gold-500 transition-colors text-sm disabled:opacity-50"
              >
                {isUploadingBanner ? t('home.uploading') : t('organizations.addBanner')}
              </button>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleBannerSelected}
              className="hidden"
            />
          </div>
        )}

        <Card className="mt-6 border-l-4" style={{ borderLeftColor: org.color }}>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: org.color }}
              aria-hidden="true"
            />
            {isEditingName ? (
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <Input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value.slice(0, MAX_NAME_LENGTH))}
                  className="flex-1 min-w-[8rem]"
                />
                <input
                  type="color"
                  value={colorDraft}
                  onChange={(e) => setColorDraft(e.target.value)}
                  className="w-9 h-9 rounded-md border border-border-default bg-ink-950 cursor-pointer"
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName || nameDraft.trim().length < 3}
                  className="text-xs text-gold-500 hover:text-gold-400"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setNameDraft(org.name);
                    setColorDraft(org.color);
                  }}
                  className="text-xs text-cream-400 hover:text-cream-100"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-semibold text-gold-500 flex-1">{org.name}</h1>
                {canManage && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-xs text-cream-400 hover:text-cream-100"
                  >
                    {t('organizations.editName')}
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-cream-400">
            {t('organizations.memberCount', { count: org.members.length })}
          </p>
        </Card>

        {actionError && (
          <p role="alert" className="text-sm text-error-500 mt-4">
            {actionError}
          </p>
        )}

        <Card className="mt-4 border-l-4" style={{ borderLeftColor: org.color }}>
          <h2 className="text-sm uppercase tracking-wide text-cream-400 mb-2">
            {t('organizations.manifestoHeading')}
          </h2>
          {isEditingManifesto ? (
            <div>
              <Textarea
                rows={6}
                value={manifestoDraft}
                onChange={(e) => setManifestoDraft(e.target.value.slice(0, MAX_MANIFESTO_LENGTH))}
              />
              <span className="text-xs text-cream-400" dir="ltr">
                {manifestoDraft.length}/{MAX_MANIFESTO_LENGTH}
              </span>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveManifesto}
                  disabled={isSavingManifesto}
                  className="text-xs text-gold-500 hover:text-gold-400"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={() => {
                    setIsEditingManifesto(false);
                    setManifestoDraft(org.manifesto ?? '');
                  }}
                  className="text-xs text-cream-400 hover:text-cream-100"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-cream-100 leading-relaxed whitespace-pre-wrap">
                {org.manifesto || t('organizations.noManifesto')}
              </p>
              {canManage && (
                <button
                  onClick={() => setIsEditingManifesto(true)}
                  className="text-xs text-gold-500 hover:text-gold-400 mt-2"
                >
                  {t('organizations.editManifesto')}
                </button>
              )}
            </div>
          )}
        </Card>

        {canViewArticles && (
          <Card
            className="mt-4 border-l-4"
            style={{ borderLeftColor: org.color }}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm uppercase tracking-wide text-cream-400">
                {t('organizations.articlesHeading')}
              </h2>
              {canWriteArticle && (
                <Link
                  to={`${ROUTES.NEW_ARTICLE}?organizationId=${org.id}`}
                  className="text-xs text-gold-500 hover:text-gold-400"
                >
                  {t('organizations.writeArticle')}
                </Link>
              )}
            </div>
            {orgArticles.length === 0 ? (
              <p className="text-sm text-cream-400">{t('organizations.noArticles')}</p>
            ) : (
              <div className="space-y-1.5">
                {orgArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    to={ROUTES.ARTICLE(article.id)}
                    className="flex items-baseline gap-2 text-sm text-cream-100 hover:text-gold-500 transition-colors"
                  >
                    <span
                      className="text-xs font-mono flex-shrink-0"
                      style={{ color: org.color }}
                      aria-hidden="true"
                    >
                      {index + 1}.
                    </span>
                    <span className="truncate">{article.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card className="mt-4 border-l-4" style={{ borderLeftColor: org.color }}>
          <h2 className="text-sm uppercase tracking-wide text-cream-400 mb-2">
            {t('organizations.membersHeading')}
          </h2>
          {org.members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 py-1.5">
              <Avatar
                avatarUrl={member.user.avatarUrl}
                fallbackText={member.user.displayName ?? '?'}
                size={28}
              />
              <span className="text-sm text-cream-100 flex-1 truncate">
                {getGenderedRole(member.user.role, member.user.gender, i18n.language)}{' '}
                {member.user.displayName ?? `${t('common.user')} ${member.user.id}`}
              </span>
              {member.isLeader && (
                <span className="text-xs text-gold-500 font-medium">
                  {t('organizations.leaderBadge')}
                </span>
              )}
              {canManage && member.user.id !== ownUserId && (
                <IconButton tone="danger" onClick={() => handleRemoveMember(member.user.id)}>
                  {t('organizations.removeMember')}
                </IconButton>
              )}
            </div>
          ))}
        </Card>

        <div className="mt-6 flex justify-center">
          {isMember ? (
            <Button variant="secondary" onClick={handleLeave}>
              {t('organizations.leave')}
            </Button>
          ) : (
            <Button onClick={handleJoin} disabled={isJoining}>
              {isJoining ? t('organizations.joining') : t('organizations.join')}
            </Button>
          )}
        </div>

        {canManage && (
          <div className="mt-8 pt-6 border-t border-border-default flex justify-center">
            <IconButton tone="danger" onClick={handleDelete}>
              {t('organizations.deleteButton')}
            </IconButton>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
