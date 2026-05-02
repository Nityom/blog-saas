"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function getBillingCycleInfo(startDateString?: string) {
  if (!startDateString) return { text: "Not Set", isFuture: false, cycleStartMs: null };
  
  const [year, month, day] = startDateString.split('-').map(Number);
  if (!year || !month || !day) return { text: "Invalid Date", isFuture: false, cycleStartMs: null };

  const startDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (startDate > today) {
    return { text: `Starts ${formatDate(startDate)}`, isFuture: true, cycleStartMs: null };
  }

  let cycleStart = new Date(today.getFullYear(), today.getMonth(), startDate.getDate());
  if (cycleStart > today) {
    cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, startDate.getDate());
  }
  const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, cycleStart.getDate());
  
  return { 
    text: `${formatDate(cycleStart)} - ${formatDate(cycleEnd)}`, 
    isFuture: false, 
    cycleStartMs: cycleStart.getTime() 
  };
}

export default function SuperAdminDashboard() {
  const clinics = useQuery(api.socialOps.getAdminOverview);
  const markPaid = useMutation(api.clinics.markPaid);

  if (clinics === undefined) {
    return <div className="p-8 text-neutral-400">Loading dashboard...</div>;
  }

  const handleMarkPaid = async (clinicId: Id<"clinics">, cycleStartMs: number) => {
    try {
      await markPaid({ clinicId, cycleStartTime: cycleStartMs });
      toast.success("Marked as paid!");
    } catch (e) {
      toast.error("Failed to mark as paid");
    }
  };

  const activeClinicsCount = clinics.filter(c => c.active).length;
  const expiredMetaCount = clinics.filter(c => c.tokenExpired).length;
  const failedSocialTodayCount = clinics.reduce((count, clinic) => count + clinic.failedTodayCount, 0);
  const unpaidCount = clinics.filter((clinic) => {
    const info = getBillingCycleInfo(clinic.subscriptionStartDate);
    if (!info.cycleStartMs) return false;
    return clinic.lastPaidCycleStart !== info.cycleStartMs;
  }).length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">Master Dashboard</h2>
        <p className="text-neutral-500 mt-2">Manage all dental clinics and view platform metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-neutral-200 text-neutral-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Clinics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900">{clinics.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-neutral-200 text-neutral-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Active Clinics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeClinicsCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-neutral-200 text-neutral-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{expiredMetaCount + failedSocialTodayCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-red-50 border-red-200 text-neutral-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Unpaid Billings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{unpaidCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200 text-neutral-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Expired Meta Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{expiredMetaCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200 text-neutral-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Failed Social Posts Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{failedSocialTodayCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-neutral-900">All Clinics</h3>
          <Link href="/super-admin/clinics/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Add Clinic</Button>
          </Link>
        </div>

        <div className="rounded-lg border border-neutral-200 overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-neutral-50">
              <TableRow className="border-neutral-200 hover:bg-transparent">
                <TableHead className="text-neutral-500 font-medium h-10">Name</TableHead>
                <TableHead className="text-neutral-500 font-medium h-10">City</TableHead>
                <TableHead className="text-neutral-500 font-medium h-10">Billing</TableHead>
                <TableHead className="text-neutral-500 font-medium h-10">Integration</TableHead>
                <TableHead className="text-neutral-500 font-medium h-10">Social</TableHead>
                <TableHead className="text-neutral-500 font-medium h-10">Status</TableHead>
                <TableHead className="text-right text-neutral-500 font-medium h-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinics.map((clinic) => {
                const billingInfo = getBillingCycleInfo(clinic.subscriptionStartDate);
                const isUnpaid = billingInfo.cycleStartMs !== null && clinic.lastPaidCycleStart !== billingInfo.cycleStartMs;

                return (
                <TableRow key={clinic._id} className="border-neutral-200 hover:bg-neutral-50/50 transition-colors">
                  <TableCell className="font-medium text-neutral-900">{clinic.name}</TableCell>
                  <TableCell className="text-neutral-600">{clinic.city}</TableCell>
                  <TableCell className="text-neutral-600">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {billingInfo.text}
                      {isUnpaid && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1 py-0 h-4">Payment Due</Badge>}
                    </div>
                    {clinic.monthlyRate !== undefined && clinic.monthlyRate !== null && <div className="text-xs text-neutral-500">{clinic.monthlyRate} / mo</div>}
                  </TableCell>
                  <TableCell className="text-neutral-600 capitalize">{clinic.integrationMethod}</TableCell>
                  <TableCell className="text-neutral-600">{clinic.socialLabel}</TableCell>
                  <TableCell>
                    {clinic.active ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Active</Badge>
                    ) : (
                      <Badge className="bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border-neutral-200">Paused</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isUnpaid && billingInfo.cycleStartMs !== null && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleMarkPaid(clinic._id, billingInfo.cycleStartMs!)}
                        >
                          Mark Paid
                        </Button>
                      )}
                      <Link href={`/super-admin/clinics/${clinic._id}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
              {clinics.length === 0 && (
                <TableRow className="border-neutral-200 hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center py-8 text-neutral-500">
                    No clinics found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
