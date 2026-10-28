import React, { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { authApi } from '../api/auth';
import {
  X,
  Upload,
  Check,
  Sparkles,
  Camera,
} from 'lucide-react';

interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateUser } = useAuth();
  const [selectedGender, setSelectedGender] = useState<'female' | 'male'>(
    user?.gender === 'male' ? 'male' : 'female'
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const role = user?.role || 'employee';

  const femaleAvatarUrl = `/assets/roles/${role}_female.png`;
  const maleAvatarUrl = `/assets/roles/${role}_male.png`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image file size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      let updated;
      if (activeTab === 'custom' && photoFile) {
        updated = await authApi.updateAvatar({ photo: photoFile });
      } else {
        updated = await authApi.updateAvatar({ gender: selectedGender });
      }
      updateUser(updated);
      setSuccessMsg('Avatar updated successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to update avatar:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0e172e] via-[#0b1224] to-[#070c18] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-white p-6 sm:p-7">
        {/* Glow orb */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Customize Profile Avatar</h2>
              <p className="text-[11px] text-slate-400">Choose your 3D role character or upload your real photo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs: 3D Gender Presets vs Upload Self Photo */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-800 mt-5">
          <button
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'preset'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3D Gender Characters</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Self Photo</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: 3D Role Avatars by Gender */}
        {activeTab === 'preset' && (
          <div className="mt-6 space-y-4">
            <p className="text-xs text-slate-300 font-medium">
              Select your preferred 3D avatar style for your role (
              <span className="capitalize font-bold text-cyan-400">{role.replace('_', ' ')}</span>):
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Female Option */}
              <div
                onClick={() => setSelectedGender('female')}
                className={`relative p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col items-center gap-3 group ${
                  selectedGender === 'female'
                    ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/15'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {selectedGender === 'female' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                  <img
                    src={femaleAvatarUrl}
                    alt="Female 3D Avatar"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    <span>Female Avatar</span>
                    <span className="text-pink-400">♀</span>
                  </p>
                  <p className="text-[10px] text-slate-400">Executive 3D Character</p>
                </div>
              </div>

              {/* Male Option */}
              <div
                onClick={() => setSelectedGender('male')}
                className={`relative p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col items-center gap-3 group ${
                  selectedGender === 'male'
                    ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/15'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {selectedGender === 'male' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                  <img
                    src={maleAvatarUrl}
                    alt="Male 3D Avatar"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    <span>Male Avatar</span>
                    <span className="text-blue-400">♂</span>
                  </p>
                  <p className="text-[10px] text-slate-400">Executive 3D Character</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Upload Custom Self Photo */}
        {activeTab === 'custom' && (
          <div className="mt-6 space-y-4">
            <p className="text-xs text-slate-300 font-medium">
              Upload your own personal photo. It will appear on your dashboard, profile, and sidebar:
            </p>

            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-2xl bg-slate-900/40 transition">
              {photoPreview ? (
                <div className="relative mb-3">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-400 shadow-xl"
                  />
                  <button
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
                  <Upload className="w-7 h-7" />
                </div>
              )}

              <label className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>{photoPreview ? 'Select Different Photo' : 'Choose Photo File'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-slate-400 mt-2">JPG, PNG or WEBP up to 5MB</p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (activeTab === 'custom' && !photoFile)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Apply & Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
