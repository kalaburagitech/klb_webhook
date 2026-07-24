"use client";

import { Save, Shield, Key, Bell, Globe } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage platform configuration and preferences.</p>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl backdrop-blur-sm overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-1">
            <Globe className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-medium text-white">General Configuration</h2>
          </div>
          <p className="text-sm text-gray-500 ml-8">Basic platform settings</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Platform Name</label>
              <input type="text" defaultValue="KalaburagiTech" className="w-full bg-gray-950/50 border border-gray-700 text-white rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Timezone</label>
              <select className="w-full bg-gray-950/50 border border-gray-700 text-white rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option>Asia/Kolkata (IST)</option>
                <option>UTC</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl backdrop-blur-sm overflow-hidden">
        <div className="p-6 border-b border-gray-800">
           <div className="flex items-center gap-3 mb-1">
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-medium text-white">Meta API Configuration</h2>
          </div>
          <p className="text-sm text-gray-500 ml-8">Webhooks and API keys (configured via env variables)</p>
        </div>
        <div className="p-6 space-y-6">
           <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Webhook URL</label>
              <div className="flex gap-3">
                <input type="text" readOnly value="https://usable-stingray-452.convex.site/webhook" className="flex-1 bg-gray-950/50 border border-gray-800 text-gray-400 rounded-xl px-4 py-2" />
                <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors">Copy</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Verify Token</label>
              <div className="flex gap-3">
                <input type="text" readOnly value="kalaburagitech_secure_verify_token" className="flex-1 bg-gray-950/50 border border-gray-800 text-gray-400 rounded-xl px-4 py-2" />
                <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors">Copy</button>
              </div>
            </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg transition-all hover:scale-[1.02]">
          <Save className="w-5 h-5 mr-2" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
