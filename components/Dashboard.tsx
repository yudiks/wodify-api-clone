"use client";

import { useState } from "react";
import Link from "next/link";
import ResourceManager from "@/components/ResourceManager";
import { resourceConfigs } from "@/lib/resource-configs";

export default function Dashboard() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = resourceConfigs[activeIndex];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wodify Clone Admin</h1>
          <p className="text-sm text-zinc-500">
            A self-contained clone of the Wodify API — browse and manage resources below.
          </p>
        </div>
        <Link href="/portal" className="text-sm text-blue-600 hover:underline">
          Member Portal →
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {resourceConfigs.map((cfg, i) => (
          <button
            key={cfg.title}
            onClick={() => setActiveIndex(i)}
            className={`rounded px-3 py-1.5 text-sm ${
              i === activeIndex
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            {cfg.title}
          </button>
        ))}
      </nav>

      <ResourceManager key={active.basePath} config={active} />
    </div>
  );
}
