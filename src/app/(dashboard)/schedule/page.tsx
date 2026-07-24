"use client";

import { useQuery } from "convex/react";

import { Clock, Calendar as CalendarIcon, CheckCircle2, XCircle } from "lucide-react";

export default function SchedulePage() {
  const scheduledPosts = useQuery("queries:getDuePosts" as any);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Publishing Schedule</h1>
        <p className="text-gray-400">View and manage your upcoming content queue.</p>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
        {scheduledPosts === undefined ? (
          <div className="text-center text-gray-500 py-12">Loading schedule...</div>
        ) : scheduledPosts.length === 0 ? (
          <div className="text-center flex flex-col items-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
              <CalendarIcon className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-300 mb-2">Queue is empty</h3>
            <p className="text-gray-500">No posts are currently scheduled to be published.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative border-l border-gray-800 ml-3 pl-8 py-2 space-y-12">
              {scheduledPosts.map((post) => (
                <div key={post._id} className="relative">
                  <div className="absolute -left-10 top-1 w-4 h-4 rounded-full border-4 border-gray-900 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="text-sm font-medium text-purple-400 w-32 flex-shrink-0 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {new Date(post.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex-1 bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/50 transition-colors cursor-pointer">
                      <p className="text-gray-300 text-sm line-clamp-2">{post.content}</p>
                      <div className="mt-3 flex gap-2">
                        {post.platforms.map((p, i) => (
                          <span key={i} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
