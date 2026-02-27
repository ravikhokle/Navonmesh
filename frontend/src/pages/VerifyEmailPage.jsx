import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import useAuthStore from '../stores/authStore';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const { verifyEmail } = useAuthStore();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const data = await verifyEmail(token);
        setMessage(data.message);
        setStatus('success');
      } catch (err) {
        setMessage(err.response?.data?.message || 'Verification failed');
        setStatus('error');
      }
    };
    verify();
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-red-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-600 rounded-xl mb-3 shadow-lg shadow-red-600/20">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Email Verification</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-200/80 p-6 sm:p-8">
          <div className="text-center py-6">
            {status === 'loading' && (
              <>
                <Loader2 size={40} className="text-red-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Verifying...</h3>
                <p className="text-sm text-gray-500">Please wait while we verify your email.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Email Verified!</h3>
                <p className="text-sm text-gray-500 mb-6">{message}</p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  Go to Login
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle size={28} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Verification Failed</h3>
                <p className="text-sm text-gray-500 mb-6">{message}</p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                  Back to Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
