import React from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ImpersonationBanner: React.FC = () => {
  const { user, impersonator, isImpersonating, stopImpersonating } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating || !user || !impersonator) {
    return null;
  }

  const handleSwitchBack = () => {
    stopImpersonating();
    navigate('/');
  };

  return (
    <div className="sticky top-0 z-[100] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 shadow-md border-b border-amber-500/40 animate-in slide-in-from-top duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-200 animate-pulse" />
          </span>
          <div className="min-w-0">
            <p className="font-bold truncate">
              You are currently logged in as{' '}
              <span className="underline decoration-amber-300 font-extrabold text-white">
                {user.name}
              </span>{' '}
              ({user.email} &bull; <span className="capitalize">{user.role.replace('_', ' ')}</span>)
            </p>
            <p className="text-[10px] text-amber-100/90 truncate">
              Original Admin Session: {impersonator.name} ({impersonator.role.replace('_', ' ')}) &mdash; All actions are performed as {user.name}.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSwitchBack}
          className="shrink-0 px-3.5 py-1.5 bg-white text-amber-900 hover:bg-amber-50 rounded-xl font-bold shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch Back to {impersonator.name}</span>
        </button>
      </div>
    </div>
  );
};
