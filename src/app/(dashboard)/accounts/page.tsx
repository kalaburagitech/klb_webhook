"use client";

import { Plus, Facebook, Instagram, MoreVertical, RefreshCw } from "lucide-react";

export default function AccountsPage() {
  // Placeholder for accounts. In reality, fetch from Convex `socialAccounts` table.
  const accounts = [
    { id: 1, platform: "facebook", name: "KalaburagiTech Page", status: "active", lastSync: "2 mins ago" },
    { id: 2, platform: "instagram", name: "@kalaburagitech_ig", status: "active", lastSync: "5 mins ago" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Social Accounts</h1>
          <p className="text-gray-400">Manage your connected Facebook and Instagram profiles.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <Plus className="w-5 h-5 mr-2" />
          Connect Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:border-gray-700 hover:shadow-xl group">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-xl ${acc.platform === 'facebook' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
                {acc.platform === 'facebook' ? <Facebook className="w-6 h-6" /> : <Instagram className="w-6 h-6" />}
              </div>
              <button className="text-gray-500 hover:text-gray-300 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-1">{acc.name}</h3>
            <div className="flex items-center gap-2 mb-6">
              <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm text-emerald-400 capitalize">{acc.status}</span>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-800 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                <span>{acc.lastSync}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
