"use client";

import { AlertTriangle, RefreshCcw, Trash2 } from "lucide-react";

export default function FailedJobsPage() {
  // Placeholders. Would useQuery from Convex
  const jobs: any[] = []; 

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Failed Jobs</h1>
        <p className="text-gray-400">Review and retry failed background tasks.</p>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm min-h-[400px]">
        {jobs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
              <AlertTriangle className="w-8 h-8 text-emerald-400 opacity-50" />
            </div>
            <h3 className="text-xl font-medium text-gray-300 mb-2">All systems clear</h3>
            <p className="text-gray-500">There are currently no failed jobs in the queue.</p>
          </div>
        ) : (
          <div className="space-y-4">
             {/* List of failed jobs would go here */}
          </div>
        )}
      </div>
    </div>
  );
}
