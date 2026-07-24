"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Terminal, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function WebhookLogsPage() {
  const logs = useQuery(api.queries.listWebhookLogs);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Webhook Logs</h1>
        <p className="text-gray-400">Monitor incoming events from Meta Graph API.</p>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/80 text-gray-300 uppercase font-medium text-xs tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4 w-1/2">Payload Snippet</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {logs === undefined ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Terminal className="w-10 h-10 text-gray-600 mb-3" />
                      <p className="text-gray-400">No webhooks received yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      {log.status === 'received' ? (
                        <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> 200 OK
                        </span>
                      ) : (
                        <span className="flex items-center text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full w-fit">
                          <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Error
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-300 capitalize">
                      {log.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-gray-950 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-400 border border-gray-800 block truncate max-w-md">
                        {JSON.stringify(log.payload)}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center">
                        View <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
