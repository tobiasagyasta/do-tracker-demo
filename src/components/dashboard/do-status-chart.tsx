"use client";

import { Info } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { DeliveryOrderProgressCounts } from "@/lib/dashboard";

interface DoStatusChartProps {
  statusCounts: DeliveryOrderProgressCounts;
}

const chartConfig = [
  {
    key: "PARTNER_UNPAID",
    label: "Belum Dibayar ke Mitra",
    shortLabel: "Belum Dibayar",
    color: "#dc2626",
  },
  {
    key: "ELIGIBLE_UNINVOICED",
    label: "Belum Ditagih",
    shortLabel: "Belum Ditagih",
    color: "#ea580c",
  },
  {
    key: "INVOICED_UNPAID",
    label: "Menunggu Pembayaran",
    shortLabel: "Menunggu Bayar",
    color: "#2563eb",
  },
  {
    key: "COMPLETED",
    label: "Lengkap",
    shortLabel: "Lengkap",
    color: "#059669",
  },
  {
    key: "MIXED",
    label: "Campuran",
    shortLabel: "Campuran",
    color: "#7c3aed",
  },
] as const;

export function DoStatusChart({ statusCounts }: DoStatusChartProps) {
  const data = chartConfig.map((item) => ({
    ...item,
    value: statusCounts[item.key],
  }));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Belum ada Delivery Order.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              strokeWidth={2}
            >
              {data.map((item) => (
                <Cell key={item.key} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${Number(value ?? 0)} DO induk`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <HoverCard>
                <HoverCardTrigger
                  aria-label={`Info status ${item.label}`}
                  className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <Info className="size-4" />
                </HoverCardTrigger>
                <HoverCardContent align="start" side="right" className="w-64">
                  <div className="space-y-1">
                    <p className="font-medium">{item.shortLabel}</p>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            <span className="text-sm font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
