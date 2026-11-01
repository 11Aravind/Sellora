"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { UserPlus, Trash2, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AddMemberDialog } from "./AddMemberDialog";
import {
  updateTeamMemberRoleAction,
  removeTeamMemberAction,
} from "../actions";
import type { TenantMember } from "../types";

interface MemberListProps {
  tenantId: string;
  tenantSlug: string;
  members: TenantMember[];
  currentUserId: string;
  isOwner: boolean;
  staffQuotaUsed: number;
  staffQuotaMax: number | null;
}

export function MemberList({
  tenantId,
  tenantSlug,
  members,
  currentUserId,
  isOwner,
  staffQuotaUsed,
  staffQuotaMax,
}: MemberListProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const isStaffQuotaFull = staffQuotaMax !== null && staffQuotaUsed >= staffQuotaMax;

  const handleRoleChange = async (memberId: string, newRole: "admin" | "staff") => {
    try {
      setActionLoadingId(memberId);
      const res = await updateTeamMemberRoleAction(tenantId, memberId, { role: newRole });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Member role updated successfully.");
      router.refresh();
    } catch {
      toast.error("Failed to update role.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (memberId: string, memberEmail?: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${memberEmail || "this member"} from the team? They will lose dashboard access immediately.`
      )
    ) {
      return;
    }

    try {
      setActionLoadingId(memberId);
      const res = await removeTeamMemberAction(tenantId, memberId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Team member removed.");
      router.refresh();
    } catch {
      toast.error("Failed to remove member.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Quota */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2.5 py-1 text-muted-foreground border-border/80">
            Staff Quota:{" "}
            {staffQuotaMax === null
              ? `${staffQuotaUsed} used (Unlimited)`
              : `${staffQuotaUsed} of ${staffQuotaMax} used`}
          </Badge>
          {isStaffQuotaFull && (
            <span className="text-xs text-destructive font-semibold flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              Staff limit reached
            </span>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          className="text-xs font-semibold gap-1.5 h-8"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Team Member</span>
        </Button>
      </div>

      <Card className="border-border/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Team Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {members.map((m) => {
                const isMemberOwner = m.role === "owner";
                const isSelf = m.user_id === currentUserId;
                const canModify = !isMemberOwner && !isSelf && isOwner;
                const isLoading = actionLoadingId === m.id;

                return (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                          {(m.fullName?.[0] || m.email?.[0] || "U").toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{m.fullName || m.email || "Unnamed User"}</span>
                            {isSelf && (
                              <span className="text-[10px] text-muted-foreground font-normal">(You)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {canModify ? (
                        <select
                          className="text-xs rounded border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          value={m.role}
                          disabled={isLoading}
                          onChange={(e) =>
                            handleRoleChange(m.id, e.target.value as "admin" | "staff")
                          }
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </select>
                      ) : (
                        <Badge
                          variant={isMemberOwner ? "default" : m.role === "admin" ? "secondary" : "outline"}
                          className="capitalize text-[11px] font-medium"
                        >
                          {isMemberOwner && <ShieldCheck className="h-3 w-3 mr-1 inline" />}
                          {m.role}
                        </Badge>
                      )}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(m.created_at), "PPP")}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {canModify ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive/80"
                          disabled={isLoading}
                          onClick={() => handleRemove(m.id, m.email)}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[11px] font-mono">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
