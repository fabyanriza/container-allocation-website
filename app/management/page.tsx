"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import DepotManagementList from "@/components/depot-management-list";
import ContainerForm from "@/components/container-form";
import ContainerList from "@/components/container-list";
import AllocationRecommendationInfo from "@/components/allocation-recommendation-info";
import BulkImportForm from "@/components/bulk-import-form";

export default function ManagementPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const [activeTab, setActiveTab] = useState<
    "depots" | "containers" | "list" | "bulk"
  >("depots");
  const [refreshKey, setRefreshKey] = useState(0);

  // Set initial tab from URL parameter
  useEffect(() => {
    if (tabParam === "bulk" || tabParam === "depots" || tabParam === "containers" || tabParam === "list") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
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
          <DepotManagementList
            key={`depots-${refreshKey}`}
            onRefresh={handleRefresh}
          />
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
