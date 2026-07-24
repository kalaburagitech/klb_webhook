"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";

import { Plus, Image as ImageIcon, Send, Clock, CalendarDays, MoreHorizontal, AlertTriangle, X, Loader2, Trash2, Edit2 } from "lucide-react";

export default function PostsPage() {
  const posts = useQuery("queries:listDashboardPosts" as any);
  const createPost = useMutation("mutations:createPost" as any);
  const updatePost = useMutation("mutations:updatePost" as any);
  const deletePost = useMutation("mutations:deletePost" as any);
  const publishPost = useAction("metaApi:publishPost" as any);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  const handleCreateAndPublish = async () => {
    if (!content) {
      setError("Content is required");
      return;
    }
    if (platforms.includes("instagram") && !imageUrl) {
      setError("Instagram requires an image URL");
      return;
    }

    setIsPublishing(true);
    setError("");

    try {
      // 1. Save to database
      let postId = editingPostId;
      if (editingPostId) {
        await updatePost({ id: editingPostId, content, platforms });
      } else {
        postId = await createPost({
          content,
          platforms,
        });
      }

      // 2. Publish to Meta
      for (const platform of platforms) {
        await publishPost({
          platform,
          content,
          mediaUrl: imageUrl || undefined,
          mediaType: imageUrl ? "image" : undefined,
        });
      }

      if (postId) {
        await updatePost({ id: postId, status: "published" });
      }

      setIsModalOpen(false);
      setContent("");
      setImageUrl("");
      setEditingPostId(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to publish post");
      if (editingPostId) {
        await updatePost({ id: editingPostId, status: "failed" });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEdit = (post: any) => {
    setEditingPostId(post._id);
    setContent(post.content);
    setPlatforms(post.platforms);
    setImageUrl("");
    setIsModalOpen(true);
  };

  const handleQuickPublish = async (post: any) => {
    if (confirm("Publish this post immediately?")) {
      try {
        for (const platform of post.platforms) {
          await publishPost({
            platform,
            content: post.content,
          });
        }
        await updatePost({ id: post._id, status: "published" });
      } catch (err: any) {
        alert(err.message || "Failed to publish");
        await updatePost({ id: post._id, status: "failed" });
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Content Library</h1>
          <p className="text-gray-400">Create, manage, and view your posts.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-[1.02]"
        >
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
            posts.map((post: any) => (
              <div key={post._id} className="p-6 hover:bg-gray-800/20 transition-colors flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-full sm:w-32 h-32 bg-gray-800 rounded-xl flex-shrink-0 flex items-center justify-center border border-gray-700/50 overflow-hidden">
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                  {/* If there was media, image tag here */}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                      {post.platforms.map((p: any, i: number) => (
                        <span key={i} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          p === 'facebook' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                        }`}>
                          {p}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleQuickPublish(post)} className="p-1.5 bg-gray-800 text-emerald-400 rounded-md hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors" title="Publish Now">
                        <Send className="w-4 h-4" />
                      </button>
                      <button onClick={() => alert("Scheduling UI coming soon!")} className="p-1.5 bg-gray-800 text-purple-400 rounded-md hover:bg-purple-500/20 hover:text-purple-300 transition-colors" title="Schedule">
                        <Clock className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(post)} className="p-1.5 bg-gray-800 text-blue-400 rounded-md hover:bg-blue-500/20 hover:text-blue-300 transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if(confirm("Delete this post?")) deletePost({ id: post._id }) }} className="p-1.5 bg-gray-800 text-red-400 rounded-md hover:bg-red-500/20 hover:text-red-300 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

      {/* Create Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-white">{editingPostId ? "Edit Post" : "Create New Post"}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingPostId(null); setContent(""); setImageUrl(""); }} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Platforms</label>
                <div className="flex gap-3">
                  {['facebook', 'instagram'].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={platforms.includes(p)}
                        onChange={(e) => {
                          if (e.target.checked) setPlatforms([...platforms, p]);
                          else setPlatforms(platforms.filter(x => x !== p));
                        }}
                        className="rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                      />
                      <span className="capitalize text-gray-300">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Content</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full h-32 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Image URL (Required for Instagram)</label>
                <div className="flex items-center bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50">
                  <div className="pl-4 text-gray-400"><ImageIcon className="w-5 h-5" /></div>
                  <input 
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-transparent border-none p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-0"
                  />
                </div>
                {imageUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-gray-700/50 bg-gray-800 relative h-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3">
              <button 
                onClick={() => { setIsModalOpen(false); setEditingPostId(null); setContent(""); setImageUrl(""); }}
                className="px-5 py-2.5 text-gray-300 hover:text-white font-medium transition-colors"
                disabled={isPublishing}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateAndPublish}
                disabled={isPublishing || !content}
                className="flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Publishing...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Publish Now</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
