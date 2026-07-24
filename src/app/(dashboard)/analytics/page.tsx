"use client";

import { BarChart3, TrendingUp, Users, Eye } from "lucide-react";

export default function AnalyticsPage() {
  const metrics = [
    { label: "Total Reach", value: "24.5K", change: "+12.5%", positive: true, icon: Eye },
    { label: "Engagement Rate", value: "5.2%", change: "+1.1%", positive: true, icon: TrendingUp },
    { label: "Followers Growth", value: "892", change: "-2.4%", positive: false, icon: Users },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Analytics Overview</h1>
        <p className="text-gray-400">Track performance across your social media channels.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((m, idx) => (
          <div key={idx} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm transition-all hover:shadow-xl hover:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-800 rounded-xl">
                <m.icon className="w-5 h-5 text-blue-400" />
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${m.positive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {m.change}
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-1">{m.label}</p>
            <h3 className="text-3xl font-bold text-white">{m.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm h-96 flex flex-col items-center justify-center">
           <BarChart3 className="w-12 h-12 text-gray-700 mb-4" />
           <p className="text-gray-500 font-medium">Audience Growth Chart Placeholder</p>
        </div>
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-white mb-6">Top Performing Posts</h3>
          <div className="space-y-4">
             {/* Placeholders for top posts */}
             {[1,2,3].map(i => (
               <div key={i} className="flex gap-4 items-center p-3 hover:bg-gray-800/30 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-700/50">
                 <div className="w-12 h-12 bg-gray-800 rounded-lg flex-shrink-0"></div>
                 <div>
                   <p className="text-sm text-gray-300 line-clamp-1 font-medium">Post snippet {i} content goes here...</p>
                   <p className="text-xs text-emerald-400 mt-1">1.2K engagements</p>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
