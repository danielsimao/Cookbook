"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Shield, User as UserIcon } from "lucide-react";
import { toast } from "@/components/toaster";
import { ResponsiveModal } from "@/components/responsive-modal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adding, setAdding] = useState(false);

  function loadUsers() {
    setLoading(true);
    setError(false);
    fetch("/api/users")
      .then((r) => {
        if (r.status === 403) throw new Error("forbidden");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setUsers)
      .catch((err) => {
        if (err.message === "forbidden") {
          toast("Admin access required", "error");
        }
        setError(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleAddUser() {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword }),
      });
      if (res.status === 409) {
        toast("Email already in use", "error");
        return;
      }
      if (!res.ok) throw new Error();
      const user = await res.json();
      setUsers((prev) => [...prev, user]);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setShowAddForm(false);
      toast("User added", "success");
    } catch {
      toast("Failed to add user", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast("User removed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove user", "error");
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <h1 className="font-display text-2xl font-bold hand-underline">Settings</h1>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <h1 className="font-display text-2xl font-bold hand-underline">Settings</h1>
        <div className="text-center py-12 space-y-4">
          <p className="font-hand text-base text-muted-foreground">
            Admin access required to view settings
          </p>
          <button onClick={loadUsers} className="btn-cookbook" aria-label="Retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold hand-underline">Settings</h1>
      </div>

      {/* Users section */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-header !mb-0">Users</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="font-hand text-base text-primary hover:underline inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add User
          </button>
        </div>

        <div className="space-y-0">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 border-b border-border/40"
            >
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                {user.role === "admin" ? (
                  <Shield className="h-4 w-4 text-primary" />
                ) : (
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="font-hand text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
              <span className="stamp-badge !text-[0.65rem] !py-0 !px-1.5 shrink-0">
                {user.role}
              </span>
              {user.role !== "admin" && (
                <button
                  onClick={() => setDeleteTarget(user)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      <ResponsiveModal open={showAddForm} onClose={() => setShowAddForm(false)}>
        <h3 className="font-display font-bold">Add User</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name"
              className="input-cookbook w-full mt-1"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@example.com"
              className="input-cookbook w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Temporary password"
              className="input-cookbook w-full mt-1"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowAddForm(false)}
            className="flex-1 py-2 border hover:bg-secondary font-hand text-base rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleAddUser}
            disabled={adding || !newName.trim() || !newEmail.trim() || !newPassword.trim()}
            className="flex-1 btn-cookbook disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add User"}
          </button>
        </div>
      </ResponsiveModal>

      {/* Delete Confirmation */}
      <ResponsiveModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <h3 className="font-display font-bold">Remove user?</h3>
        <p className="text-sm text-muted-foreground">
          This will permanently delete <strong>{deleteTarget?.name}</strong> and all their recipes, meal plans, and pantry data.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 py-2 border hover:bg-secondary font-hand text-base rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteUser}
            className="flex-1 py-2 bg-destructive text-destructive-foreground font-hand text-base font-bold rounded"
          >
            Remove
          </button>
        </div>
      </ResponsiveModal>
    </div>
  );
}
