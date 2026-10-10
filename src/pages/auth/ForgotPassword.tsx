import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { resetPassword } from '@/services/auth';
import { showToast } from '@/components/Toast';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      showToast('Password reset link sent to your email', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset password</h2>
      <p className="text-sm text-gray-500 mb-6">Enter your email to receive a password reset link</p>

      {sent ? (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          A password reset link has been sent to <strong>{email}</strong>. Please check your inbox and follow the instructions.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 transition">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <Link to="/login" className="mt-6 flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>
    </AuthLayout>
  );
}
