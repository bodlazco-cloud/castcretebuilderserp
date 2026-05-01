import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  status?: string;
}

export default function KpiCard({
  title, value, description, icon, trend, trendUp, status,
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className="p-2 bg-slate-50 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex items-center gap-1">
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-bold ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
              {trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {trend}
            </span>
          )}
          {status && !trend && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
              {status}
            </span>
          )}
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight leading-none">{value}</div>
      <div className="text-sm font-semibold text-slate-700 mt-1.5">{title}</div>
      {description && <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</div>}
    </div>
  );
}
