import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../../api/auth';
import { User, Lock, Sliders, CheckCircle2, AlertCircle, Camera, Sparkles } from 'lucide-react';
import { AvatarCustomizerModal } from '../../components/AvatarCustomizerModal';

export const ProfileSettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences'>('profile');

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Preferences
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileError('');

    try {
      const updated = await authApi.updateProfile({
        name,
        department_id: user?.department_id || null,
      });
      updateUser(updated);
      setProfileMsg('Profile updated successfully.');
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    setPasswordMsg('');
    setPasswordError('');

    try {
      await authApi.updatePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profile & Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal credentials, account details, and notification preferences.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Tabs matching Mockup Screen 19 */}
        <div className="flex border-b border-slate-100 px-6 pt-2 text-xs font-semibold gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
        </div>

        {/* Tab 1: Profile Details */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="p-6 sm:p-8 space-y-6 text-xs">
            {profileMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{profileMsg}</span>
              </div>
            )}
            {profileError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{profileError}</span>
              </div>
            )}

            {/* User Identity Display */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 shadow-md flex items-center justify-center">
                    <img
                      src={user?.avatar_url || `/assets/roles/${user?.role || 'employee'}_${user?.gender || 'female'}.png`}
                      alt={user?.name || 'User'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xl font-bold text-white absolute">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md cursor-pointer transition hover:scale-110"
                    title="Change Avatar"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{user?.name}</h3>
                  <p className="text-slate-400">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                      {user?.role?.replace('_', ' ') || 'User'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Department: {user?.department?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Customize 3D Avatar / Photo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                {savingProfile ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="p-6 sm:p-8 space-y-4 text-xs max-w-md">
            {passwordMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{passwordMsg}</span>
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                {savingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Preferences */}
        {activeTab === 'preferences' && (
          <div className="p-6 sm:p-8 space-y-6 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">Notification Channels</h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                <div>
                  <p className="font-bold text-slate-800">Email Notifications</p>
                  <p className="text-slate-400 text-[11px]">Receive summary emails when tasks are assigned or returned</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                <div>
                  <p className="font-bold text-slate-800">In-App Live Alerts</p>
                  <p className="text-slate-400 text-[11px]">Display bell badge and dropdown notifications in header</p>
                </div>
                <input
                  type="checkbox"
                  checked={inAppNotifs}
                  onChange={(e) => setInAppNotifs(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                <div>
                  <p className="font-bold text-slate-800">Sound Notifications</p>
                  <p className="text-slate-400 text-[11px]">Play subtle audio tone when new assignment is received</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <AvatarCustomizerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />
    </div>
  );
};

export default ProfileSettingsPage;
