import React, { useMemo, useState } from 'react';
import { Printer, CalendarDays } from 'lucide-react';
import { db } from '../db';
import { useStore } from '../store';
import { format } from 'date-fns';
import { RevenueDoc, RevenueRow } from './documents/RevenueDoc';

const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseISODate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export const RevenueReport: React.FC = () => {
  const { currentUser } = useStore();

  const allOrders = db.getOrders().filter(o => !o.is_deleted);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateFrom, setDateFrom] = useState(format(monthStart, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(today, 'yyyy-MM-dd'));

  const rows: RevenueRow[] = useMemo(() => {
    const from = parseISODate(dateFrom);
    const to = parseISODate(dateTo);
    const fromD = from ? toDateOnly(from) : null;
    const toD = to ? toDateOnly(to) : null;

    const m = new Map<string, { day: string; revenue: number; paid: number; debt: number; clientsSet: Set<string> }>();

    for (const o of allOrders) {
      const od = parseISODate(o.order_date);
      if (!od) continue;
      const d = toDateOnly(od);
      if (fromD && d < fromD) continue;
      if (toD && d > toD) continue;

      const key = format(d, 'yyyy-MM-dd');
      const total = o.items?.reduce((acc, i) => acc + Number(i.total_price), 0) || 0;
      const paid = Number(o.prepayment || '0');
      const debt = total - paid;

      const clientKey = `${(o.client_name || '').trim()}|${(o.client_phone || '').trim()}`;

      const prev = m.get(key) || { day: key, revenue: 0, paid: 0, debt: 0, clientsSet: new Set<string>() };
      prev.revenue += total;
      prev.paid += paid;
      prev.debt += debt;
      if (o.client_name?.trim()) prev.clientsSet.add(clientKey);

      m.set(key, prev);
    }

    return Array.from(m.values())
      .map(v => ({
        day: v.day,
        clients: v.clientsSet.size,
        revenue: v.revenue,
        paid: v.paid,
        debt: v.debt,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [allOrders, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const revenue = rows.reduce((acc, r) => acc + r.revenue, 0);
    const paid = rows.reduce((acc, r) => acc + r.paid, 0);
    const debt = rows.reduce((acc, r) => acc + r.debt, 0);
    return { revenue, paid, debt };
  }, [rows]);

  const handlePrint = () => window.print();

  return (
    <div className="p-6 flex flex-col h-full bg-white">
      {/* Панель */}
      <div className="print:hidden flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <CalendarDays size={14} /> Период отчёта
          </div>
          <button
            onClick={handlePrint}
            className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Printer size={16} className="text-blue-600" /> Печать / PDF
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Дата с</div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Дата по</div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div id="print-area">
        <RevenueDoc
          period={{ dateFrom, dateTo }}
          totals={totals}
          rows={rows}
          responsible={currentUser?.username || '—'}
        />
      </div>
    </div>
  );
};