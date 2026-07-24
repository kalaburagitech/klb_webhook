"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CalendarDays,
  BarChart3,
  Terminal,
  AlertTriangle,
  Settings,
  LogOut,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Accounts", href: "/accounts", icon: Users },
  { name: "Posts", href: "/posts", icon: MessageSquare },
  { name: "Schedule", href: "/schedule", icon: CalendarDays },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Webhook Logs", href: "/logs", icon: Terminal },
  { name: "Failed Jobs", href: "/failed-jobs", icon: AlertTriangle },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900/50 backdrop-blur-xl border-r border-gray-800 transition-all duration-300 shadow-2xl">
      <div className="flex h-20 items-center justify-center border-b border-gray-800 px-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent tracking-wider">
          KalaburagiTech
        </h1>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300 ease-out hover:scale-[1.02] ${
                isActive
                  ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-300 ${
                  isActive ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"
                }`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <button
          onClick={() => {
            document.cookie = "admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.href = "/login";
          }}
          className="group flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-all duration-300"
        >
          <LogOut className="mr-3 h-5 w-5 text-red-500 group-hover:text-red-400 transition-colors duration-300" />
          Logout
        </button>
      </div>
    </div>
  );
}
