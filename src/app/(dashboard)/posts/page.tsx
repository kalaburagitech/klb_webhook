"use client";

import { useQuery } from "convex/react";

import { Plus, Image as ImageIcon, Send, Clock, CalendarDays, MoreHorizontal } from "lucide-react";

export default function PostsPage() {
  const posts = useQuery("queries:listDashboardPosts" as any);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Content Library</h1>
          <p className="text-gray-400">Create, manage, and view your posts.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-[1.02]">
          <Plus className="w-5 h-5 mr-2" />
          Create Post
        </button>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl backdrop-blur-sm overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-medium text-white">All Posts</h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-gray-800 text-xs text-gray-300 rounded-full cursor-pointer hover:bg-gray-700">All</span>
            <span className="px-3 py-1 bg-blue-500/20 text-xs text-blue-400 border border-blue-500/30 rounded-full cursor-pointer hover:bg-blue-500/30">Drafts</span>
            <span className="px-3 py-1 bg-purple-500/20 text-xs text-purple-400 border border-purple-500/30 rounded-full cursor-pointer hover:bg-purple-500/30">Scheduled</span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-800">
          {posts === undefined ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-300 mb-2">No posts yet</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first post.</p>
              <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">Create a new post</button>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post._id} className="p-6 hover:bg-gray-800/20 transition-colors flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-full sm:w-32 h-32 bg-gray-800 rounded-xl flex-shrink-0 flex items-center justify-center border border-gray-700/50 overflow-hidden">
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                  {/* If there was media, image tag here */}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                      {post.platforms.map((p, i) => (
                        <span key={i} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          p === 'facebook' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                        }`}>
                          {p}
                        </span>
                      ))}
                    </div>
                    <button className="text-gray-500 hover:text-gray-300">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-gray-300 text-sm line-clamp-2 mb-4 leading-relaxed">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className={`flex items-center px-2 py-1 rounded-md ${
                      post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' :
                      post.status === 'scheduled' ? 'bg-purple-500/10 text-purple-400' :
                      post.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {post.status === 'published' && <Send className="w-3 h-3 mr-1.5" />}
                      {post.status === 'scheduled' && <Clock className="w-3 h-3 mr-1.5" />}
                      {post.status === 'failed' && <AlertTriangle className="w-3 h-3 mr-1.5" />}
                      <span className="capitalize">{post.status}</span>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
