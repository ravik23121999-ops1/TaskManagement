import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { departmentsApi } from '../../api/departments';
import { settingsApi } from '../../api/settings';
import type { Department, DepartmentMember } from '../../api/departments';
import { useAuth } from '../auth/AuthContext';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { Building2, Plus, Edit2, Search, X, Users, MessageSquare, ChevronRight, ExternalLink, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Deletion permission & modal state
  const [canDeleteRecords, setCanDeleteRecords] = useState(false);
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
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

  // Edit / Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Department Members Modal
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedDeptForMembers, setSelectedDeptForMembers] = useState<Department | null>(null);
  const [membersList, setMembersList] = useState<DepartmentMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

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

  const handleDeleteDepartment = async () => {
    if (!deletingDept) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await departmentsApi.delete(deletingDept.id);
      setDeletingDept(null);
      loadDepartments();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete department.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [page]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await departmentsApi.list({
        search: search.trim() || undefined,
        page,
        per_page: 10,
      });
      setDepartments(response.data || []);
      setPage(response.meta?.current_page || 1);
      setLastPage(response.meta?.last_page || 1);
      setTotal(response.meta?.total || 0);
    } catch (err) {
      console.error('Failed to load departments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMembers = async (dept: Department) => {
    setSelectedDeptForMembers(dept);
    setIsMembersModalOpen(true);
    setLoadingMembers(true);
    setMemberSearchQuery('');
    try {
      const res = await departmentsApi.getMembers(dept.id);
      setMembersList(res.members || []);
    } catch (err) {
      console.error('Failed to load department members', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredMembers = membersList.filter((m) =>
    m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (d: Department) => {
    setEditingDept(d);
    setName(d.name);
    setDescription(d.description || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingDept) {
        await departmentsApi.update(editingDept.id, { name, description });
      } else {
        await departmentsApi.create({ name, description });
      }
      setIsModalOpen(false);
      loadDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (d: Department) => {
    try {
      if (d.is_active) {
        await departmentsApi.deactivate(d.id);
        showToast(`Department "${d.name}" deactivated.`, 'success');
      } else {
        await departmentsApi.activate(d.id);
        showToast(`Department "${d.name}" activated.`, 'success');
      }
      loadDepartments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update department status', 'error');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadDepartments();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Department Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize teams and filter task workloads across operational departments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Department</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search department name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6 w-16">#</th>
                <th className="py-3.5 px-6">Department</th>
                <th className="py-3.5 px-6">Members</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton rows={6} cols={5} />
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No departments found.</p>
                  </td>
                </tr>
              ) : (
                departments.map((d, idx) => (
                  <tr
                    key={d.id}
                    onClick={() => handleOpenMembers(d)}
                    className="hover:bg-blue-50/40 transition cursor-pointer group"
                    title="Click department to view team members"
                  >
                    <td className="py-4 px-6 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition flex items-center gap-1.5">
                          <span>{d.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                      </div>
                      {d.description && <p className="text-[11px] text-slate-400 mt-0.5">{d.description}</p>}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenMembers(d);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-bold transition text-xs shadow-2xs"
                        title="Click to view all members"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>{d.members_count} members</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(d);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                          d.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {d.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMembers(d);
                          }}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="View all members of this department"
                        >
                          <Users className="w-3 h-3 text-blue-600" />
                          <span>View Members</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(d);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {canDeleteRecords && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteError('');
                              setDeletingDept(d);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                            title="Delete department"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} lastPage={lastPage} total={total} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operations, IT, Finance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe functions and responsibilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {saving ? 'Saving...' : editingDept ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Members Modal */}
      {isMembersModalOpen && selectedDeptForMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedDeptForMembers.name} Department
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                      {selectedDeptForMembers.members_count} members
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedDeptForMembers.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {selectedDeptForMembers.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedDeptForMembers.description || 'No specific description provided for this department.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Search Bar */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter members by name, email, role..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <button
                onClick={() => {
                  setIsMembersModalOpen(false);
                  navigate(`/users?department=${selectedDeptForMembers.id}`);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0"
                title="Manage and assign users in full Users directory"
              >
                <span>Directory</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            {/* Members Body List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingMembers ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-200 shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-32 bg-slate-200 rounded" />
                          <div className="h-3 w-44 bg-slate-100 rounded" />
                        </div>
                      </div>
                      <div className="h-6 w-20 bg-slate-200 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {memberSearchQuery ? 'No matching members found' : 'No members in this department yet'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      {memberSearchQuery
                        ? 'Try modifying your search query to find employees in this department.'
                        : 'Assign employees or managers to this department from the Users Management section.'}
                    </p>
                  </div>
                  {!memberSearchQuery && (
                    <button
                      onClick={() => {
                        setIsMembersModalOpen(false);
                        navigate('/users');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Assign Members in Users</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredMembers.map((member) => {
                  let roleBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (member.role === 'admin') roleBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                  else if (member.role === 'sub_admin') roleBadge = 'bg-purple-50 text-purple-700 border-purple-200';
                  else if (member.role === 'employee') roleBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs"
                    >
                      {/* Avatar & User Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs flex items-center justify-center">
                            <img
                              src={
                                member.avatar_url ||
                                `/assets/roles/${member.role}_${member.gender || 'female'}.png`
                              }
                              alt={member.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="text-sm font-bold text-white absolute">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                          {member.is_active && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {member.name}
                            </h4>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border capitalize ${roleBadge}`}>
                              {member.role.replace('_', ' ')}
                            </span>
                            {!member.is_active && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{member.email}</p>
                        </div>
                      </div>

                      {/* Workload Metrics & Quick Message Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span
                            title="Active ongoing branch tasks"
                            className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 font-bold"
                          >
                            {member.active_tasks_count} active
                          </span>
                          <span
                            title="Completed branch tasks"
                            className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold"
                          >
                            {member.completed_tasks_count} done
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsMembersModalOpen(false);
                            navigate('/messages');
                          }}
                          className="h-7 px-2.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-600 transition text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="Open Work Messages"
                        >
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <span>Chat</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Showing <strong>{filteredMembers.length}</strong> of <strong>{membersList.length}</strong> department team members
              </span>
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Department Confirmation Modal */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Department</h3>
                  <p className="text-xs text-slate-500">Department record removal</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingDept(null)}
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
              Are you sure you want to delete <span className="font-bold text-slate-900">"{deletingDept.name}"</span>?
              {deletingDept.tasks_count > 0 && (
                <span className="block mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                  Note: This department has {deletingDept.tasks_count} associated task(s) and will be deactivated to preserve historical integrity.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDepartment}
                disabled={deleting}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Department'}
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

export default DepartmentsPage;
