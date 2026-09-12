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
  const reelHooks = useQuery("autoPost:getReelHooks" as any);
  const updateConfig = useMutation("autoPost:updateConfig" as any);
  const addImage = useMutation("autoPost:addImage" as any);
  const removeImage = useMutation("autoPost:removeImage" as any);
  const addReelHook = useMutation("autoPost:addReelHook" as any);
  const removeReelHook = useMutation("autoPost:removeReelHook" as any);
  const generateUploadUrl = useMutation("mutations:generateUploadUrl" as any);
  const triggerAutoPost = useAction("autoPost:triggerAutoPost" as any);
  const generateAndSaveImage = useAction("autoPost:generateAndSaveImage" as any);

  const [theme, setTheme] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [newReelHook, setNewReelHook] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  
  const [isAddingHook, setIsAddingHook] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState("");
  const [useStaticLogo, setUseStaticLogo] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState("");

  // Sync local form state when config loads.
  useEffect(() => {
    if (config) {
      setTheme(config.theme ?? "Daily tech tips");
      setPlatforms(config.platforms ?? ["facebook", "instagram"]);
      setUseStaticLogo(config.useStaticLogo ?? false);
      setCompanyName(config.companyName ?? "");
      setWebsite(config.website ?? "");
      setMobile(config.mobile ?? "");
      setEmail(config.email ?? "");
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
      await updateConfig({ theme, platforms, useStaticLogo, companyName, website, mobile, email });
    } catch (e: any) {
      setError(e.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHook = async () => {
    if (!newReelHook.trim()) return;
    setIsAddingHook(true);
    try {
      await addReelHook({ hook: newReelHook });
      setNewReelHook("");
    } catch (e: any) {
      setError(e.message || "Failed to add reel hook");
    } finally {
      setIsAddingHook(false);
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

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    setError("");
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateConfig({ staticLogoStorageId: storageId });
      alert("Company logo uploaded — it will now be composed into generated ads.");
    } catch (err: any) {
      console.error(err);
      setError("Failed to upload company logo");
    } finally {
      setIsUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setError("");
    try {
      const generatedCaption = await generateAndSaveImage();
      setPreview(generatedCaption as string);
    } catch (e: any) {
      setError(e.message || "Failed to generate AI caption and image preview");
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
          OpenAI writes the caption and generates a branded ad image, then auto-publishes to your pages twice a day.
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
          disabled={isTriggering}
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
          Last run ({config.lastRunSlot}): {new Date(config.lastRunAt).toISOString().replace('T', ' ').split('.')[0]}
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
          <label className="text-sm font-medium text-gray-300">Topic / Theme</label>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Daily tech tips for students and businesses"
            className="w-full h-16 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-800 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">Company Name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. KalaburagiTech"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-2.5 text-sm text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">Website URL</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g. https://kalaburagitech.com/"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-2.5 text-sm text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">Mobile Number</label>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9880020224"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-2.5 text-sm text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">Email Address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. kalaburagitech@gmail.com"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl p-2.5 text-sm text-white"
            />
          </div>
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

        <div className="flex items-center justify-between border-t border-gray-800 pt-4">
          <div>
            <label className="text-sm font-medium text-white flex items-center gap-2">
              Post logo as-is (skip AI image)
            </label>
            <p className="text-xs text-gray-400 mt-1">
              ON: publishes your raw logo every time. OFF: OpenAI generates a fresh ad
              and composes your uploaded logo, company name, phone and website into it.
            </p>
          </div>
          <button
            onClick={() => setUseStaticLogo(!useStaticLogo)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              useStaticLogo ? "bg-purple-500" : "bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useStaticLogo ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
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
                Upload to Queue
              </button>
            </div>

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadLogo}
                disabled={isUploadingLogo}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={isUploadingLogo}
                className="flex h-full items-center px-5 bg-purple-900/30 border border-purple-700/50 hover:bg-purple-800/40 text-purple-300 rounded-xl transition-colors disabled:opacity-50"
              >
                {isUploadingLogo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                Upload Company Logo
              </button>
            </div>
          </div>
  
          {config?.staticLogoUrl && (
            <div className="mt-4 p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.staticLogoUrl} alt="Company Logo" className="w-16 h-16 object-cover rounded-lg border border-purple-500/30" />
              <div className="text-sm text-purple-300">
                <p className="font-medium">Active Company Logo</p>
                <p className="text-purple-400/80">
                  {useStaticLogo
                    ? "Published as-is on every auto-post."
                    : "Composed into every AI-generated ad."}
                </p>
              </div>
            </div>
          )}

        {preview && (
          <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-200 text-sm whitespace-pre-wrap">
            <span className="text-gray-400 font-medium mb-2 block">Generated Caption:</span>
            {preview}
          </div>
        )}

        {/* Queue Grid */}
        <div className="pt-4 border-t border-gray-800 mt-6">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Day-wise Reel Hooks</h3>
          <p className="text-xs text-gray-400 mb-4">The auto-poster will consume these hooks one by one each day when generating captions.</p>
          
          <div className="flex gap-3 mb-6">
            <input
              value={newReelHook}
              onChange={(e) => setNewReelHook(e.target.value)}
              placeholder="e.g. 95% of React developers are still building websites the slow way!"
              className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <button
              onClick={handleAddHook}
              disabled={isAddingHook || !newReelHook.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {isAddingHook ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Hook"}
            </button>
          </div>

          <div className="space-y-2">
            {reelHooks === undefined ? (
              <div className="text-gray-500 text-sm">Loading hooks...</div>
            ) : reelHooks.length === 0 ? (
              <div className="text-gray-500 text-sm py-4">No reel hooks added.</div>
            ) : (
              reelHooks.map((hook: any) => (
                <div key={hook._id} className={`flex items-center justify-between p-3 rounded-lg border ${hook.usedAt ? 'bg-gray-800/30 border-gray-800' : 'bg-gray-800/80 border-gray-700'}`}>
                  <div>
                    <p className={`text-sm ${hook.usedAt ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{hook.hook}</p>
                    {hook.usedAt && <p className="text-xs text-emerald-500 mt-1">Used on {new Date(hook.usedAt).toISOString().split('T')[0]}</p>}
                  </div>
                  <button
                    onClick={() => removeReelHook({ id: hook._id })}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Existing Image Queue Grid */}
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
