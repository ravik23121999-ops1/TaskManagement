import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api/users';
import { departmentsApi } from '../../api/departments';
import { settingsApi } from '../../api/settings';
import type { User } from '../../api/auth';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../auth/AuthContext';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  X,
  Trash2,
  AlertCircle,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'sub_admin' | 'employee'>('employee');
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Delete records permission & modal state
  const [canDeleteRecords, setCanDeleteRecords] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    checkPermissions();
  }, [currentUser?.role]);

  const checkPermissions = async () => {
    if (currentUser?.role === 'admin') {
      setCanDeleteRecords(true);
      return;
    }
    if (currentUser?.role === 'sub_admin') {
      try {
        const res = await settingsApi.getSystemSettings();
        setCanDeleteRecords(Boolean(res.user_capabilities?.can_delete_records));
      } catch {
        setCanDeleteRecords(false);
      }
    } else {
      setCanDeleteRecords(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await usersApi.delete(deletingUser.id);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, [page, roleFilter, deptFilter]);

  const loadDepartments = async () => {
    try {
      const res = await departmentsApi.list({ per_page: 100 });
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await usersApi.list({
        search: search.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        department_id: deptFilter !== 'all' ? deptFilter : undefined,
        page,
        per_page: 10,
      });
      setUsers(response.data || []);
      setPage(response.meta?.current_page || 1);
      setLastPage(response.meta?.last_page || 1);
      setTotal(response.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setDepartmentId(undefined);
    setIsActive(true);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setDepartmentId(u.department_id || undefined);
    setIsActive(u.is_active);
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          name,
          email,
          role,
          department_id: departmentId || null,
          password: password.trim() ? password.trim() : undefined,
          is_active: isActive,
        });
      } else {
        await usersApi.create({
          name,
          email,
          password: password.trim() || 'password123',
          role,
          department_id: departmentId || null,
          is_active: isActive,
        });
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user. Please check credentials.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      if (u.is_active) {
        await usersApi.deactivate(u.id);
      } else {
        await usersApi.activate(u.id);
      }
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage employee accounts, assign roles (Admin, Sub-Admin, Employee), and link departments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add User</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="w-36">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="sub_admin">Sub-Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div className="w-40">
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table matching Mockup Screen 15 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6 w-16">#</th>
                <th className="py-3.5 px-6">Name</th>
                <th className="py-3.5 px-6">Email</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Department</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No users match your filters.</p>
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  let roleBadgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (u.role === 'admin') roleBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
                  else if (u.role === 'sub_admin') roleBadgeBg = 'bg-purple-50 text-purple-700 border-purple-200';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-6 text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">{u.email}</td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${roleBadgeBg}`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-slate-700 font-medium">
                        {u.department?.name || 'Unassigned'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {canDeleteRecords && u.id !== currentUser?.id && (
                            <button
                              onClick={() => { setDeleteError(''); setDeletingUser(u); }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                              title="Delete user account"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUser ? 'Edit User Account' : 'Add New User'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Password {editingUser ? '(leave blank to keep unchanged)' : '*'}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingUser}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="employee">Employee</option>
                    {currentUser?.role === 'admin' && (
                      <>
                        <option value="sub_admin">Sub-Admin</option>
                        <option value="admin">Admin</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={departmentId || ''}
                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-700">Account is Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete User Account</h3>
                  <p className="text-xs text-slate-500">Permanent record deletion</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{deletingUser.name}"</span> ({deletingUser.email})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
