'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

const EASY_TEXTING_FORM_URL = 'https://storage.googleapis.com/cf-prod-widgets/433290282658963456-EZ/7406a3e5-35c8-4662-86ff-d4cf21a8bf6a/f8211439-8e42-46e2-91f4-9f230d9cd711-1746793700230.html';

export default function RegisterSMSPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleRegisterNow = () => {
    // Open Easy Texting form in new tab
    window.open(EASY_TEXTING_FORM_URL, '_blank');
  };

  const handleAlreadyRegistered = () => {
    // Mark as acknowledged and proceed to main site
    localStorage.setItem('sms_registration_acknowledged', 'true');
    router.push('/tools');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full">
        {/* Main Card */}
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-white mb-2">
            Register for League Communications
          </h1>
          <p className="text-slate-400 text-center mb-6">
            Stay up to date on league news, roster updates, deadlines & more
          </p>

          {/* Warning Box */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-semibold">Important Notice</p>
                <p className="text-red-300/80 text-sm mt-1">
                  You <strong>MUST</strong> register for SMS updates. If you do not register, <strong>your games will NOT count</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Register Button */}
          <button
            onClick={handleRegisterNow}
            className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <MessageSquare className="w-5 h-5" />
            Register Now
            <ExternalLink className="w-4 h-4 ml-1" />
          </button>

          <p className="text-slate-500 text-xs text-center mt-3">
            Opens in a new tab • Takes less than 30 seconds
          </p>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-slate-500 text-sm">or</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* Already Registered */}
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-3">
              Already a registered member?
            </p>
            <button
              onClick={handleAlreadyRegistered}
              className="py-3 px-6 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mx-auto border border-slate-600 hover:border-slate-500"
            >
              <CheckCircle className="w-5 h-5 text-green-400" />
              I've Already Registered
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-slate-500 text-xs text-center mt-4">
          Questions? Contact the commissioner for help.
        </p>
      </div>
    </div>
  );
}

