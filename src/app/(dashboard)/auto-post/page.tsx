"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import {
  Sparkles,
  Clock,
  Loader2,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Wand2,
} from "lucide-react";

export default function AutoPostPage() {
  const config = useQuery("autoPost:getConfig" as any);
  const images = useQuery("autoPost:listImages" as any);
  const updateConfig = useMutation("autoPost:updateConfig" as any);
  const addImage = useMutation("autoPost:addImage" as any);
  const removeImage = useMutation("autoPost:removeImage" as any);
  const generateUploadUrl = useMutation("mutations:generateUploadUrl" as any);
  const previewCaption = useAction("gemini:previewCaption" as any);

  const [theme, setTheme] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState("");

  // Sync local form state when config loads.
  useEffect(() => {
    if (config) {
      setTheme(config.theme ?? "Daily tech tips");
      setPlatforms(config.platforms ?? ["facebook", "instagram"]);
    }
  }, [config]);

  const enabled = config?.enabled ?? false;

  const handleToggle = async () => {
    setError("");
    try {
      await updateConfig({ enabled: !enabled });
    } catch (e: any) {
      setError(e.message || "Failed to update");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      await updateConfig({ theme, platforms });
    } catch (e: any) {
      setError(e.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    setPreview("");
    setError("");
    try {
      const text = await previewCaption({ theme });
      setPreview(text);
    } catch (e: any) {
      setError(e.message || "Failed to generate preview");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        await addImage({ storageId });
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to upload image(s)");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-purple-400" />
          Auto-Post (AI)
        </h1>
        <p className="text-gray-400">
          Gemini writes a caption and auto-publishes to your pages twice a day, rotating through your image pool.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Master switch */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-white mb-1">
            Automatic daily posting
          </h2>
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Runs daily at <span className="text-gray-200 font-medium">8:00 AM</span> and <span className="text-gray-200 font-medium">8:00 PM IST</span>
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={config === undefined}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            enabled ? "bg-emerald-500" : "bg-gray-700"
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {enabled && (images?.length ?? 0) === 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Auto-post is ON but your image pool is empty — add at least one image below or nothing will post.
        </div>
      )}

      {config?.lastRunAt && (
        <div className="text-xs text-gray-500">
          Last run ({config.lastRunSlot}): {new Date(config.lastRunAt).toLocaleString()}
          {config.lastError ? (
            <span className="text-red-400"> — error: {config.lastError}</span>
          ) : (
            <span className="text-emerald-400 inline-flex items-center gap-1"> — <CheckCircle2 className="w-3 h-3" /> success</span>
          )}
        </div>
      )}

      {/* Content settings */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
        <h2 className="text-lg font-medium text-white">Content settings</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Topic / theme</label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Daily tech tips for students and businesses"
            className="w-full h-24 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Platforms</label>
          <div className="flex gap-4">
            {["facebook", "instagram"].map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={platforms.includes(p)}
                  onChange={() => togglePlatform(p)}
                  className="rounded border-gray-700 bg-gray-800 text-purple-500 focus:ring-purple-500"
                />
                <span className="capitalize text-gray-300">{p}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save settings
          </button>
          <button
            onClick={handlePreview}
            disabled={isPreviewing || !theme}
            className="flex items-center px-5 py-2.5 bg-purple-600/80 hover:bg-purple-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {isPreviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Preview a caption
          </button>
        </div>

        {preview && (
          <div className="mt-2 p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-200 text-sm whitespace-pre-wrap">
            {preview}
          </div>
        )}
      </div>

      {/* Image pool */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-white">Image pool</h2>
            <p className="text-sm text-gray-400">Each post rotates to the next image. Instagram requires an image.</p>
          </div>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={isUploading}
              className="flex items-center px-5 py-2.5 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              Upload images
            </button>
          </div>
        </div>

        {images === undefined ? (
          <div className="text-gray-500 text-sm py-6 text-center">Loading...</div>
        ) : images.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center text-gray-500">
            <ImageIcon className="w-10 h-10 mb-3 text-gray-600" />
            No images yet. Upload a few so the auto-poster has pictures to use.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img: any) => (
              <div key={img._id} className="relative group rounded-xl overflow-hidden border border-gray-700/50 bg-gray-800 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="pool" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage({ id: img._id })}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30 hover:text-red-300"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
