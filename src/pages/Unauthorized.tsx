import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { isHousehold, isManagement, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (isHousehold) navigate('/household/dashboard');
      else if (isManagement) navigate('/management/dashboard');
      else navigate('/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [isHousehold, isManagement, loading, navigate]);

  const handleRedirect = () => {
    if (isHousehold) navigate('/household/dashboard');
    else if (isManagement) navigate('/management/dashboard');
    else navigate('/login');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const noValidRole = !isHousehold && !isManagement;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-lg p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 mb-6">
          {noValidRole
            ? 'Your account does not have access to this area. Please contact your administrator if you believe this is an error.'
            : "You don't have permission to access this page. You will be redirected to your dashboard shortly."}
        </p>
        {noValidRole ? (
          <button onClick={handleSignOut} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        ) : (
          <button onClick={handleRedirect} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition">
            <ArrowLeft className="w-4 h-4" /> Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
