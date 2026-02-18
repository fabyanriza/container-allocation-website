"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { ManagementTabHandler } from "@/components/management-tab-handler";
import DepotManagementList from "@/components/depot-management-list";
import ContainerForm from "@/components/container-form";
import ContainerList from "@/components/container-list";
import AllocationRecommendationInfo from "@/components/allocation-recommendation-info";
import BulkImportForm from "@/components/bulk-import-form";

export default function ManagementPage() {
  const [activeTab, setActiveTab] = useState<
    "depots" | "containers" | "list" | "bulk"
  >("depots");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = useCallback(
    (tab: "depots" | "containers" | "list" | "bulk") => {
      setActiveTab(tab);
    },
    [],
  );

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Suspense fallback={null}>
        <ManagementTabHandler onTabChange={handleTabChange} />
      </Suspense>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Management
          </h1>
          <p className="text-muted-foreground">Manage depots and containers</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={activeTab === "depots" ? "default" : "outline"}
            onClick={() => setActiveTab("depots")}
            className="px-6"
          >
            Depots
          </Button>
          <Button
            variant={activeTab === "containers" ? "default" : "outline"}
            onClick={() => setActiveTab("containers")}
            className="px-6"
          >
            Add Container
          </Button>
          <Button
            variant={activeTab === "bulk" ? "default" : "outline"}
            onClick={() => setActiveTab("bulk")}
            className="px-6"
          >
            Alokasi Bongkaran
          </Button>
          <Button
            variant={activeTab === "list" ? "default" : "outline"}
            onClick={() => setActiveTab("list")}
            className="px-6"
          >
            Container List
          </Button>
        </div>

        {/* Content */}
        {activeTab === "depots" && (
          <DepotManagementList onRefresh={handleRefresh} />
        )}

        {activeTab === "containers" && (
          <div className="space-y-6">
            <AllocationRecommendationInfo />
            <ContainerForm
              key={`containers-${refreshKey}`}
              onSubmitSuccess={handleRefresh}
            />
          </div>
        )}

        {activeTab === "bulk" && (
          <BulkImportForm
            key={`bulk-${refreshKey}`}
            onSuccess={handleRefresh}
          />
        )}

        {activeTab === "list" && (
          <ContainerList key={`list-${refreshKey}`} refreshKey={refreshKey} />
        )}
      </div>
    </main>
  );
}
