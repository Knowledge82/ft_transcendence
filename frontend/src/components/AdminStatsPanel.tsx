import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { AdminStats } from '../api/admin';
import { Card } from './ui';
import { getDateLocale } from '../utils/dateLocale';

const ROLE_LABEL_KEYS: Record<string, string> = {
  HERMANO: 'admin.statsRoleHermano',
  INQUISIDOR: 'admin.statsRoleInquisidor',
  ARZOBISPO: 'admin.statsRoleArzobispo',
};

interface AdminStatsPanelProps {
  stats: AdminStats;
}

export function AdminStatsPanel({ stats }: AdminStatsPanelProps) {
  const { t, i18n } = useTranslation();

  const chartData = stats.registrations.map((r) => ({
    count: r.count,
    label: new Date(r.date).toLocaleDateString(getDateLocale(i18n.language), {
      day: 'numeric',
      month: 'short',
    }),
  }));

  return (
    <div className="mb-8 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.usersByRole.map((r) => (
          <Card key={r.role} className="text-center py-3">
            <p className="text-xl text-gold-500 font-semibold">{r.count}</p>
            <p className="text-xs text-cream-400">{t(ROLE_LABEL_KEYS[r.role] ?? r.role)}</p>
          </Card>
        ))}
        <Card className="text-center py-3">
          <p className="text-xl text-gold-500 font-semibold">{stats.totalArticles}</p>
          <p className="text-xs text-cream-400">{t('admin.statsArticles')}</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-xl text-gold-500 font-semibold">{stats.totalOrganizations}</p>
          <p className="text-xs text-cream-400">{t('admin.statsOrganizations')}</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-xl text-gold-500 font-semibold">{stats.totalOrgMembers}</p>
          <p className="text-xs text-cream-400">{t('admin.statsOrgMembers')}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm uppercase tracking-wide text-cream-400 mb-4">
          {t('admin.statsRegistrations')}
        </h2>
        <div className="h-48" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border-default)"
                opacity={0.3}
              />
              <XAxis dataKey="label" stroke="var(--color-cream-400)" fontSize={12} />
              <YAxis allowDecimals={false} stroke="var(--color-cream-400)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-ink-950)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'var(--color-cream-100)' }}
              />
              <Bar dataKey="count" fill="var(--color-gold-500)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm uppercase tracking-wide text-cream-400 mb-3">
          {t('admin.statsTopActive')}
        </h2>
        {stats.topActiveUsers.length === 0 ? (
          <p className="text-sm text-cream-400">{t('admin.statsNoData')}</p>
        ) : (
          <ol className="space-y-1">
            {stats.topActiveUsers.map((u, i) => (
              <li key={u.userId} className="flex justify-between text-sm">
                <span className="text-cream-100">
                  {i + 1}. {u.displayName}
                </span>
                <span className="text-gold-500 font-medium" dir="ltr">
                  {u.loginCount}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
