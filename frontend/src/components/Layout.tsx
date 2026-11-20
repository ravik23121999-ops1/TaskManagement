import React, { useState, useEffect, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const PageContentLoader: React.FC = () => (
  <div className="space-y-6 animate-pulse select-none">
    {/* Page Header Skeleton */}
    <div className="flex items-center justify-between pb-1">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-200/90 rounded-xl" />
        <div className="h-3.5 w-72 bg-slate-100 rounded-md" />
      </div>
      <div className="h-9 w-28 bg-slate-200/70 rounded-xl" />
    </div>

    {/* Metric Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2 shadow-2xs">
          <div className="h-3 w-20 bg-slate-100 rounded" />
          <div className="h-6 w-14 bg-slate-200/80 rounded" />
        </div>
      ))}
    </div>

    {/* Table / Content Skeleton */}
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-2xs min-h-[380px]">
      <div className="h-8 bg-slate-100/80 rounded-xl w-full max-w-sm mb-4" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-50 rounded-xl w-full flex items-center px-4 gap-4">
            <div className="h-3 w-20 bg-slate-200/70 rounded" />
            <div className="h-3 w-44 bg-slate-100 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ql_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const location = useLocation();

  // Automatically close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ql_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      toggleSidebarCollapse();
    } else {
      setMobileSidebarOpen((prev) => !prev);
    }
  };

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f9fafc] to-[#f1f5f9] text-slate-800 flex flex-col lg:flex-row font-sans selection:bg-blue-600 selection:text-white">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        } ml-0`}
      >
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          isSidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<PageContentLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Layout;
