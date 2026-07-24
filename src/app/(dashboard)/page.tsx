"use client";

import { useQuery } from "convex/react";

import { BarChart3, Clock, AlertTriangle, MessageSquare } from "lucide-react";

export default function Dashboard() {
  const stats = useQuery("queries:getDashboardStats" as any);

  const statCards = [
    {
      name: "Total Posts",
      value: stats?.totalPosts ?? "...",
      icon: MessageSquare,
      color: "from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30",
    },
    {
      name: "Scheduled",
      value: stats?.scheduledPosts ?? "...",
      icon: Clock,
      color: "from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30",
    },
    {
      name: "Failed Jobs",
      value: stats?.failedJobs ?? "...",
      icon: AlertTriangle,
      color: "from-red-500/20 to-orange-500/20 text-orange-400 border-orange-500/30",
    },
    {
      name: "Engagement",
      value: "Coming Soon",
      icon: BarChart3,
      color: "from-emerald-500/20 to-teal-500/20 text-teal-400 border-teal-500/30",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Overview</h1>
        <p className="text-gray-400">Welcome to your Social Media Automation platform.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => (
          <div
            key={stat.name}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${stat.color} p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="absolute top-0 right-0 p-4 opacity-50">
              <stat.icon className="h-24 w-24 translate-x-4 -translate-y-4 transform" />
            </div>
            <dt>
              <div className="absolute rounded-xl bg-gray-900/50 p-3 backdrop-blur-md">
                <stat.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-300">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
              <p className="text-2xl font-semibold text-white">
                {stat.value}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Placeholder for charts or recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 backdrop-blur-sm shadow-xl">
          <h2 className="text-lg font-medium text-white mb-4">Recent Activity</h2>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-xl">
            <p className="text-gray-500">Activity feed will appear here</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 backdrop-blur-sm shadow-xl">
          <h2 className="text-lg font-medium text-white mb-4">Publishing Success Rate</h2>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-xl">
            <p className="text-gray-500">Chart will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
