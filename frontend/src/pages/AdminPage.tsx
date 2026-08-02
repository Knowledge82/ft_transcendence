import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { listAllUsers, changeUserRole, deleteUser } from '../api/admin';
import type { AdminUser, Role } from '../api/admin';

const ROLES: Role[] = ['HERMANO', 'GUARDIAN', 'ARZOBISPO'];

export function AdminPage() {
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
    if (!confirm('¿Seguro que quieres eliminar esta cuenta? Esta acción no se puede deshacer.')) {
      return;
    }
    await deleteUser(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <p className="text-cream-400">Cargando...</p>
      </div>
    );
  }

  if (ownRole !== 'ARZOBISPO') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink-950 gap-4">
        <p className="text-cream-100">No tienes el rango necesario para entrar aquí.</p>
        <Link to="/altar" className="text-gold-500 hover:text-gold-400">
          ← Volver al Altar
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link to="/altar" className="text-sm text-gold-500 hover:text-gold-400">
          ← Volver
        </Link>

        <h1 className="text-3xl font-semibold text-gold-500 mt-4 mb-8">
          Santuario — Administración
        </h1>

        <div className="bg-ink-900 border border-ink-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-cream-400 text-left">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rango</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-ink-800 last:border-0">
                  <td className="px-4 py-3 text-cream-100">
                    {user.displayName ?? `Usuario ${user.id}`}
                  </td>
                  <td className="px-4 py-3 text-cream-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="bg-ink-950 border border-ink-800 rounded-md px-2 py-1 text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-error-500 hover:text-red-400 text-xs"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
