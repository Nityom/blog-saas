"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SuperAdminDashboard() {
  const clinics = useQuery(api.clinics.getAll);

  if (clinics === undefined) {
    return <div className="p-8 text-neutral-400">Loading dashboard...</div>;
  }

  const activeClinicsCount = clinics.filter(c => c.active).length;

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
            <div className="text-3xl font-bold text-red-500">0</div>
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
                <TableHead className="text-neutral-500 font-medium h-10">Integration</TableHead>
                <TableHead className="text-neutral-500 font-medium h-10">Status</TableHead>
                <TableHead className="text-right text-neutral-500 font-medium h-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinics.map((clinic) => (
                <TableRow key={clinic._id} className="border-neutral-200 hover:bg-neutral-50/50 transition-colors">
                  <TableCell className="font-medium text-neutral-900">{clinic.name}</TableCell>
                  <TableCell className="text-neutral-600">{clinic.city}</TableCell>
                  <TableCell className="text-neutral-600 capitalize">{clinic.integrationMethod}</TableCell>
                  <TableCell>
                    {clinic.active ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Active</Badge>
                    ) : (
                      <Badge className="bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border-neutral-200">Paused</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/super-admin/clinics/${clinic._id}`}>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        Manage
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {clinics.length === 0 && (
                <TableRow className="border-neutral-200 hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center py-8 text-neutral-500">
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
