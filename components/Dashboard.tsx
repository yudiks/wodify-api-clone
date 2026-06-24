"use client";

import { useState } from "react";
import Link from "next/link";
import ResourceManager from "@/components/ResourceManager";
import { resourceConfigs } from "@/lib/resource-configs";

export default function Dashboard() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = resourceConfigs[activeIndex];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950 text-zinc-100">
      {/* App bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-sm font-semibold text-zinc-950">
          A
        </div>
        <h1 className="text-base font-semibold text-white">Wodify Clone Admin</h1>
        <Link href="/portal" className="text-xs text-zinc-400 hover:text-zinc-200">
          Member Portal →
        </Link>
      </header>

      {/* Tabs */}
      <nav className="flex gap-6 overflow-x-auto border-b border-zinc-800 px-4">
        {resourceConfigs.map((cfg, i) => (
          <button
            key={cfg.title}
            onClick={() => setActiveIndex(i)}
            className={`shrink-0 border-b-2 px-1 py-3 text-sm font-medium transition ${
              i === activeIndex ? "border-teal-400 text-teal-400" : "border-transparent text-zinc-500"
            }`}
          >
            {cfg.title}
          </button>
        ))}
      </nav>

      <div className="flex flex-1 flex-col gap-6 p-6">
        <ResourceManager key={active.basePath} config={active} />
      </div>
    </div>
  );
}
