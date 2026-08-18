import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { listAllUsers, changeUserRole, deleteUser } from '../api/admin';
import type { AdminUser, Role } from '../api/admin';
import { PageContainer, LoadingScreen, IconButton, BackLink } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ROUTES } from '../routes';
import { getGenderedRole } from '../utils/genderedRole';
import { useConfirm } from '../context/ConfirmContext';

const ROLES: Role[] = ['HERMANO', 'INQUISIDOR', 'ARZOBISPO'];

export function AdminPage() {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const [ownRole, setOwnRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.get<{ role: Role }>('/users/me').then(async (me) => {
      setOwnRole(me.data.role);
      if (me.data.role === 'ARZOBISPO') {
        const allUsers = await listAllUsers();
        setUsers(allUsers);
      }
      setIsLoading(false);
    });
  }, []);

  async function handleRoleChange(userId: number, newRole: Role) {
    const updated = await changeUserRole(userId, newRole);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
  }

  async function handleDelete(userId: number) {
    if (!(await confirm(t('admin.confirmDelete')))) {
      return;
    }
    await deleteUser(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (ownRole !== 'ARZOBISPO') {
    return (
      <PageContainer className="flex flex-col items-center justify-center gap-4">
        <p className="text-cream-100">{t('admin.notAllowed')}</p>
        <BackLink to={ROUTES.HOME} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center">
          <BackLink to={ROUTES.HOME} />
          <LanguageSwitcher />
        </div>

        <h1 className="text-3xl font-semibold text-gold-500 mt-4 mb-8">
          {t('admin.title')}
        </h1>

        <div className="bg-ink-900 border border-border-default rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-cream-400 text-start">
                <th className="px-4 py-3">{t('admin.user')}</th>
                <th className="px-4 py-3">{t('admin.email')}</th>
                <th className="px-4 py-3">{t('admin.rank')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border-default last:border-0">
                  <td className="px-4 py-3 text-cream-100">
                    {user.displayName ?? `${t('common.user')} ${user.id}`}
                  </td>
                  <td className="px-4 py-3 text-cream-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="bg-ink-950 border border-border-default rounded-md px-2 py-1 text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {getGenderedRole(role, user.gender, i18n.language)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <IconButton tone="danger" onClick={() => handleDelete(user.id)}>
                      {t('admin.delete')}
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
