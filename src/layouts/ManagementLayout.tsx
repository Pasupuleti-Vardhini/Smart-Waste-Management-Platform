import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, PackageCheck, ScanLine, ClipboardCheck, Trash2,
  Boxes, Layers, Send, Bell, BarChart3, FileText, History, Settings,
  Users, LogOut, Menu, X, Recycle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/utils/format';

const baseNav = [
  { to: '/management/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/management/collection', label: 'Collection Management', icon: Truck },
  { to: '/management/receiving', label: 'Waste Receiving', icon: PackageCheck },
  { to: '/management/ai-detection', label: 'AI Detection', icon: ScanLine },
  { to: '/management/manual-review', label: 'Manual Review', icon: ClipboardCheck },
  { to: '/management/smart-bins', label: 'Smart Bins', icon: Trash2 },
  { to: '/management/inventory', label: 'Storage & Inventory', icon: Boxes },
  { to: '/management/requirements', label: 'Material Requirements', icon: Layers },
  { to: '/management/dispatch', label: 'Dispatch', icon: Send },
  { to: '/management/alerts', label: 'Alerts', icon: Bell },
  { to: '/management/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/management/reports', label: 'Reports', icon: FileText },
  { to: '/management/history', label: 'History', icon: History },
  { to: '/management/settings', label: 'Settings', icon: Settings },
];

export function ManagementLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, facility, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = isAdmin
    ? [...baseNav, { to: '/management/users', label: 'Management Users', icon: Users }]
    : baseNav;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-50">
              <Recycle className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">GreenCycle</p>
              <p className="text-xs text-gray-400">{isAdmin ? 'Admin Portal' : 'Management Portal'}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {facility && (
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-xs text-gray-400">Facility</p>
            <p className="text-sm font-medium text-gray-700 truncate">{facility.name}</p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">
              {getInitials(profile?.full_name || 'User')}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{isAdmin ? 'Administrator' : 'Management'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Recycle className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-bold text-gray-900">GreenCycle</span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
