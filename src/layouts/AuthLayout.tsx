import type { ReactNode } from 'react';
import { Recycle, Leaf } from 'lucide-react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 to-teal-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
              <Recycle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold">GreenCycle</h1>
              <p className="text-sm text-teal-100">Smart Waste Management</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-4">Building a sustainable future, one collection at a time.</h2>
            <p className="text-teal-100 max-w-md">
              Request waste collection, track your environmental impact, and earn rewards for responsible waste disposal.
            </p>
            <div className="mt-8 space-y-3">
              {[
                'Schedule waste pickups at your convenience',
                'Track collection status in real-time',
                'Earn rewards for every kilogram recycled',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-teal-50">
                  <Leaf className="w-4 h-4" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-teal-200">© 2026 GreenCycle Waste Management. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
