import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CheckCircle2,
  Eye,
  EyeOff,
  Copy,
  Check,
  LogIn,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, impersonateUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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

  // Password Reveal & Copy State (Admin only)
  const [revealedPasswords, setRevealedPasswords] = useState<{ [userId: number]: boolean }>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const togglePasswordReveal = (userId: number) => {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyPassword = (userId: number, pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete records permission & modal state
  const [canDeleteRecords, setCanDeleteRecords] = useState(false);
  const [canImpersonate, setCanImpersonate] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const handleLoginAs = async (targetUser: User) => {
    try {
      await impersonateUser(targetUser.id);
      navigate('/');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to log in as user.', 'error');
    }
  };

  useEffect(() => {
    checkPermissions();
  }, [currentUser?.role]);

  const checkPermissions = async () => {
    if (currentUser?.role === 'admin') {
      setCanDeleteRecords(true);
      setCanImpersonate(true);
      return;
    }
    if (currentUser?.role === 'sub_admin') {
      try {
        const res = await settingsApi.getSystemSettings();
        setCanDeleteRecords(Boolean(res.user_capabilities?.can_delete_records));
        setCanImpersonate(Boolean(res.user_capabilities?.can_impersonate));
      } catch {
        setCanDeleteRecords(false);
        setCanImpersonate(false);
      }
    } else {
      setCanDeleteRecords(false);
      setCanImpersonate(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await usersApi.delete(deletingUser.id);
      showToast(`User "${deletingUser.name}" deleted successfully.`);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  // Fluent instant live search debounced by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, [page, roleFilter, deptFilter, debouncedSearch]);

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
        search: debouncedSearch.trim() || undefined,
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
      showToast(editingUser ? 'User profile updated successfully.' : 'New user registered successfully.');
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
        showToast(`${u.name} deactivated successfully.`);
      } else {
        await usersApi.activate(u.id);
        showToast(`${u.name} activated successfully.`);
      }
      loadUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update user status.', 'error');
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
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-6 whitespace-nowrap">User ID</th>
                <th className="py-3.5 px-6">Name</th>
                <th className="py-3.5 px-6">Email</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Department</th>
                {currentUser?.role === 'admin' && (
                  <th className="py-3.5 px-6">Password</th>
                )}
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={currentUser?.role === 'admin' ? 8 : 7} className="py-12 text-center text-slate-400">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={currentUser?.role === 'admin' ? 8 : 7} className="py-12 text-center text-slate-400">
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize select-none ${roleBadgeBg}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
                          <span>{u.role.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-slate-700 font-medium">
                        {u.department?.name || 'Unassigned'}
                      </td>
                      {currentUser?.role === 'admin' && (
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-lg">
                            <span className="font-mono text-[11px] font-semibold text-slate-700 min-w-[70px] select-all">
                              {revealedPasswords[u.id] ? (u.plain_password || 'password') : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordReveal(u.id)}
                              className="text-slate-400 hover:text-slate-600 transition p-0.5 cursor-pointer"
                              title={revealedPasswords[u.id] ? 'Hide password' : 'Show password'}
                            >
                              {revealedPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyPassword(u.id, u.plain_password || 'password')}
                              className="text-slate-400 hover:text-blue-600 transition p-0.5 cursor-pointer relative"
                              title="Copy password"
                            >
                              {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer active:scale-95 ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                          }`}
                          title="Click to toggle active status"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canImpersonate && u.id !== currentUser?.id && (currentUser?.role === 'admin' || u.role === 'employee') && (
                            <button
                              onClick={() => handleLoginAs(u)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs hover:shadow transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
                              title={`Log in as ${u.name}`}
                            >
                              <LogIn className="w-3 h-3 text-white" />
                              <span>Login As</span>
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(u)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs hover:shadow transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <Edit2 className="w-3 h-3 text-white" />
                            <span>Edit</span>
                          </button>

                          {canDeleteRecords && u.id !== currentUser?.id && (
                            <button
                              onClick={() => { setDeleteError(''); setDeletingUser(u); }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Password {editingUser ? '(leave blank to keep unchanged)' : '*'}
                  </label>
                  {editingUser && currentUser?.role === 'admin' && (
                    <span className="text-[11px] text-slate-500 font-normal">
                      Current password:{' '}
                      <strong className="text-slate-800 font-mono select-all">
                        {editingUser.plain_password || 'password'}
                      </strong>
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  placeholder={editingUser ? 'Enter new password to change' : 'Min 6 characters'}
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
      {/* Floating Modern Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 text-xs font-semibold select-none bg-white/95 text-slate-800 border-slate-200 max-w-md">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
