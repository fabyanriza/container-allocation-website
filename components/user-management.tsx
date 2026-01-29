"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Plus, Trash2, Edit2 } from "lucide-react"
import { UserRole, getRoleLabel, getRoleDescription } from "@/lib/rbac"

interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
  last_sign_in_at?: string
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<UserRole>("operator")
  const [newEmail, setNewEmail] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch users from custom users table
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setUsers(data || [])
    } catch (err) {
      console.error("Error fetching users:", err)
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) {
      setError("Email is required")
      return
    }

    try {
      const supabase = createClient()

      // Insert user into users table
      const { data, error } = await supabase
        .from("users")
        .insert({
          email: newEmail,
          role: newRole,
        })
        .select()

      if (error) throw error

      setSuccess(true)
      setNewEmail("")
      setNewRole("operator")
      fetchUsers()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Error adding user:", err)
      setError(err instanceof Error ? err.message : "Failed to add user")
    }
  }

  async function handleUpdateRole(userId: string, role: UserRole) {
    try {
      const supabase = createClient()

      const { error } = await supabase.from("users").update({ role }).eq("id", userId)

      if (error) throw error

      setSuccess(true)
      setEditingUser(null)
      fetchUsers()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Error updating role:", err)
      setError(err instanceof Error ? err.message : "Failed to update role")
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const supabase = createClient()

      const { error } = await supabase.from("users").delete().eq("id", userId)

      if (error) throw error

      setSuccess(true)
      fetchUsers()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Error deleting user:", err)
      setError(err instanceof Error ? err.message : "Failed to delete user")
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "superadmin":
        return "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300"
      case "depot_manager":
        return "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
      case "operator":
        return "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
      default:
        return "bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-300"
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">Loading users...</div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New User
          </CardTitle>
          <CardDescription>Create a new user and assign a role</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/10">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-900/10">
              <AlertDescription className="text-green-800 dark:text-green-300">User saved successfully!</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="operator">Operator</option>
                  <option value="depot_manager">Depot Manager</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Add User
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="p-4 border border-border rounded-lg flex items-center justify-between hover:bg-accent/50">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">{getRoleDescription(user.role as UserRole)}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {editingUser === user.id ? (
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="px-2 py-1 text-sm border border-input rounded-md bg-background text-foreground"
                      >
                        <option value="operator">Operator</option>
                        <option value="depot_manager">Depot Manager</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    ) : (
                      <Badge className={`${getRoleBadgeColor(user.role as UserRole)} cursor-default`}>
                        {getRoleLabel(user.role as UserRole)}
                      </Badge>
                    )}

                    {editingUser === user.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRole(user.id, newRole)}
                          className="h-8 px-2"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(null)}
                          className="h-8 px-2"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(user.id)
                            setNewRole(user.role as UserRole)
                          }}
                          className="h-8 px-2"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user.id)}
                          className="h-8 px-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
