"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface ActivityLog {
  id: string
  user_email: string
  action: string
  resource: string
  resource_id?: string | number
  changes?: Record<string, any>
  timestamp: string
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([])
  const [filterResource, setFilterResource] = useState<string>("all")
  const [filterAction, setFilterAction] = useState<string>("all")

  useEffect(() => {
    fetchLogs()
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchLogs, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let filtered = logs

    if (filterResource !== "all") {
      filtered = filtered.filter((log) => log.resource === filterResource)
    }

    if (filterAction !== "all") {
      filtered = filtered.filter((log) => log.action === filterAction)
    }

    setFilteredLogs(filtered)
  }, [logs, filterResource, filterAction])

  async function fetchLogs() {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100)

      if (error) throw error

      setLogs(data || [])
    } catch (err) {
      console.error("Error fetching activity logs:", err)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
      case "update":
        return "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
      case "delete":
        return "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300"
      case "view":
        return "bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-300"
      default:
        return "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
    }
  }

  const resources = [...new Set(logs.map((log) => log.resource))]
  const actions = [...new Set(logs.map((log) => log.action))]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Resource</label>
              <select
                value={filterResource}
                onChange={(e) => setFilterResource(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Resources</option>
                {resources.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Actions</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Track all user actions and changes</CardDescription>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Timestamp</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Resource</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-accent/50">
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium">{log.user_email}</td>
                      <td className="py-3 px-4">
                        <Badge className={getActionBadgeColor(log.action)}>{log.action.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3 px-4 text-foreground">{log.resource}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {log.resource_id ? `ID: ${log.resource_id}` : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
