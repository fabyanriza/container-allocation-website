"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ManagementTabHandlerProps {
  onTabChange: (tab: "depots" | "containers" | "list" | "bulk") => void;
}

export function ManagementTabHandler({ onTabChange }: ManagementTabHandlerProps) {
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const tabParam = searchParams.get("tab");
    
    if (tabParam === "bulk" || tabParam === "depots" || tabParam === "containers" || tabParam === "list") {
      onTabChange(tabParam);
    }
  }, [searchParams, onTabChange]);

  if (!isClient) return null;
  return null;
}
