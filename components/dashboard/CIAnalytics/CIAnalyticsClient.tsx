"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, BarChart3 } from "lucide-react";
import type { CIAnalyticsData } from "@/types/ci-analytics";
import CIMetricsRow from "./CIMetricsRow";
import CIWorkflowChart from "./CIWorkflowChart";
import CIWorkflowTable from "./CIWorkflowTable";
import CIRepoHealth from "./CIRepoHealth";
import CIInsightsCards from "./CIInsightsCards";

export default function CIAnalyticsClient({ username }: { username: string }) {
  const [data, setData] = useState<CIAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/ci-analytics?username=${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error("Failed to fetch CI analytics");
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [username]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-cyan-500" />
        <p className="font-medium">Fetching CI workflow analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-red-500">
        <p className="font-medium">Error loading CI analytics: {error}</p>
      </div>
    );
  }

  if (data.totalRuns === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-gray-500 border border-dashed border-gray-300 dark:border-zinc-800 rounded-3xl p-12">
        <BarChart3 className="w-16 h-16 mb-4 text-gray-400" />
        <p className="font-medium text-lg mb-2">No CI workflows found</p>
        <p className="text-sm text-center max-w-md">Create a GitHub Actions workflow to start tracking CI analytics.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex flex-col gap-8 w-full max-w-full">
      <CIMetricsRow data={data} />

      <CIWorkflowChart data={data} />

      <CIInsightsCards insights={data.insights} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <CIWorkflowTable runs={data.recentRuns} />
        <CIRepoHealth repos={data.repoHealth} />
      </div>
    </motion.div>
  );
}
