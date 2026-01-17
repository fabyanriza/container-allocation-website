"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, CheckCircle, XCircle } from "lucide-react"

interface Operator {
  id: number
  email: string
  name: string | null
  is_active: boolean
  created_at: string
}

export default function UsersPage() {
  const [operators, setOperators] = useState<Operator[]>([])
  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchOperators()
  }, [])

  async function fetchOperators() {
    try {
      const res = await fetch("/api/operators")
      const data = await res.json()
      setOperators(data.operators || [])
    } catch (err) {
      setMessage({ type: "error", text: "Failed to fetch operators" })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddOperator(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName }),
      })

      if (!res.ok) throw new Error("Failed to add operator")

      setNewEmail("")
      setNewName("")
      setMessage({ type: "success", text: "Operator added successfully" })
      await fetchOperators()
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to add operator" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteOperator(id: number) {
    if (!confirm("Are you sure you want to remove this operator?")) return

    try {
      const res = await fetch(`/api/operators/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete operator")

      setMessage({ type: "success", text: "Operator removed successfully" })
      await fetchOperators()
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete operator" })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage operators who can access the system</p>
      </div>

      {message && (
        <Alert
          className={
            message.type === "success"
              ? "border-green-200 bg-green-50 dark:bg-green-900/10"
              : "border-red-200 bg-red-50 dark:bg-red-900/10"
          }
        >
          <AlertDescription
            className={
              message.type === "success" ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add New Operator</CardTitle>
          <CardDescription>Add an email to allow access to the system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddOperator} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="operator@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Operator"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Operators</CardTitle>
          <CardDescription>List of users who have access to the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading operators...</p>
          ) : operators.length === 0 ? (
            <p className="text-muted-foreground">No operators yet</p>
          ) : (
            <div className="space-y-3">
              {operators.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{op.email}</div>
                    {op.name && <div className="text-sm text-muted-foreground">{op.name}</div>}
                    <div className="text-xs text-muted-foreground mt-1">
                      Added {new Date(op.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {op.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteOperator(op.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
