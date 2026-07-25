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
  const triggerAutoPost = useAction("autoPost:triggerAutoPost" as any);
  const generateAndSaveImage = useAction("autoPost:generateAndSaveImage" as any);

  const [theme, setTheme] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [isTriggering, setIsTriggering] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState("");

  // Sync local form state when config loads.
  useEffect(() => {
    if (config) {
      setTheme(config.theme ?? "Daily tech tips");
      setImagePrompt(config.imagePrompt ?? "");
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
      await updateConfig({ theme, imagePrompt, platforms });
    } catch (e: any) {
      setError(e.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualTrigger = async () => {
    setIsTriggering(true);
    setError("");
    try {
      await triggerAutoPost();
      alert("Auto-post triggered successfully! Check your Facebook and Instagram.");
    } catch (e: any) {
      setError(e.message || "Failed to trigger auto-post");
    } finally {
      setIsTriggering(false);
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

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setError("");
    try {
      const generatedCaption = await generateAndSaveImage({ theme, imagePrompt });
      setPreview(generatedCaption as string);
    } catch (e: any) {
      setError(e.message || "Failed to generate AI image");
    } finally {
      setIsGeneratingImage(false);
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

      <div className="flex justify-end">
        <button
          onClick={handleManualTrigger}
          disabled={isTriggering || (images?.length ?? 0) === 0}
          className="flex items-center px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {isTriggering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Run Auto-Post Now
        </button>
      </div>

      {/* Status Warning */}
      {enabled && (images?.length ?? 0) === 0 && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Auto-post is ON. Your queue is empty, but don't worry! New posts will be generated dynamically right before publishing!
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

      {/* Combined Content & Preview Section */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-medium text-white">Content & Image Settings</h2>
            <p className="text-sm text-gray-400">Set your theme and generate previews. The cron job will automatically use these settings.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Caption topic</label>
          <p className="text-xs text-gray-500">What the caption is written about. Gemini turns this into marketing copy + hashtags.</p>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Daily tech tips for students and businesses"
            className="w-full h-24 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Image style / prompt</label>
          <p className="text-xs text-gray-500">Describes what the image looks like. Used exactly as written to generate the image. Leave blank to auto-generate from the caption topic.</p>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="e.g. Abstract futuristic technology background, glowing circuit patterns, blue and cyan gradient, 8K"
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
            onClick={handleGenerateImage}
            disabled={isGeneratingImage || !theme}
            className="flex items-center px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {isGeneratingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Caption & Image Preview
          </button>

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
              className="flex h-full items-center px-5 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
              Manual Upload
            </button>
          </div>
        </div>

        {preview && (
          <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-200 text-sm whitespace-pre-wrap">
            <span className="text-gray-400 font-medium mb-2 block">Generated Caption:</span>
            {preview}
          </div>
        )}

        {/* Queue Grid */}
        <div className="pt-4 border-t border-gray-800 mt-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Scheduled Queue (Posts ready to publish)</h3>
          {images === undefined ? (
            <div className="text-gray-500 text-sm py-6 text-center">Loading...</div>
          ) : images.length === 0 ? (
            <div className="py-6 text-center flex flex-col items-center text-gray-500 bg-gray-900/50 rounded-xl border border-dashed border-gray-700/50">
              <ImageIcon className="w-8 h-8 mb-2 text-gray-600" />
              <span className="text-sm">No pre-generated posts in the queue. They will be generated automatically at 7:30 AM/PM!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img: any) => (
                <div key={img._id} className="relative group rounded-xl overflow-hidden border border-gray-700/50 bg-gray-800 shadow-sm hover:border-gray-500 transition-colors flex flex-col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="pool" className="w-full aspect-square object-cover" />
                  
                  {img.caption && (
                    <div className="p-3 text-xs text-gray-300 bg-gray-900 border-t border-gray-700/50 flex-1">
                      <div className="line-clamp-4">{img.caption}</div>
                    </div>
                  )}

                  <button
                    onClick={() => removeImage({ id: img._id })}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
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
    </div>
  );
}
