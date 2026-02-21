import React, { useMemo, useState } from 'react';
import { Printer, CalendarDays } from 'lucide-react';
import { db } from '../db';
import { useStore } from '../store';
import { format } from 'date-fns';

const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseISODate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};
const money = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${n.toFixed(2)}%`;

export const DiscountsReport: React.FC = () => {
  const { currentUser } = useStore();

  const allOrders = db.getOrders().filter(o => !o.is_deleted);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateFrom, setDateFrom] = useState(format(monthStart, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(today, 'yyyy-MM-dd'));

  const rows = useMemo(() => {
    const from = parseISODate(dateFrom);
    const to = parseISODate(dateTo);
    const fromD = from ? toDateOnly(from) : null;
    const toD = to ? toDateOnly(to) : null;

    return allOrders
      .filter(o => {
        const od = parseISODate(o.order_date);
        if (!od) return false;
        const d = toDateOnly(od);
        if (fromD && d < fromD) return false;
        if (toD && d > toD) return false;
        return true;
      })
      .map(o => {
        const sumBefore = o.items?.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.price)), 0) || 0;
        const sumAfter = o.items?.reduce((acc, i) => acc + Number(i.total_price), 0) || 0;
        const discount = sumBefore - sumAfter;
        const discountPct = sumBefore > 0 ? (discount / sumBefore) * 100 : 0;
        return {
          id: o.id,
          date: o.order_date,
          invoice: o.invoice_number || `№${o.id}`,
          client: o.client_name,
          phone: o.client_phone,
          sumBefore,
          sumAfter,
          discount,
          discountPct
        };
      })
      .filter(r => r.discount > 0.005) // показываем только реально скидочные
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allOrders, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const sumBefore = rows.reduce((acc, r) => acc + r.sumBefore, 0);
    const sumAfter = rows.reduce((acc, r) => acc + r.sumAfter, 0);
    const discount = rows.reduce((acc, r) => acc + r.discount, 0);
    const avgPct = sumBefore > 0 ? (discount / sumBefore) * 100 : 0;
    return { sumBefore, sumAfter, discount, avgPct };
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

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-bold text-gray-600">
          В отчёт попадают только заказы, где скидка &gt; 0.
        </div>
      </div>

      <div id="print-area">
        <div className="mb-6 border-b-2 border-black pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-black uppercase tracking-tight">ОТЧЁТ ПО СКИДКАМ</div>
              <div className="text-xs font-bold text-gray-600 mt-1">
                Период: {format(new Date(dateFrom), 'dd.MM.yyyy')} — {format(new Date(dateTo), 'dd.MM.yyyy')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black italic">FloorManager Pro</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Управленческий отчёт</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="text-[10px] font-black uppercase text-gray-400">До скидки</div>
              <div className="font-black font-mono">{money(totals.sumBefore)} ₽</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="text-[10px] font-black uppercase text-gray-400">После скидки</div>
              <div className="font-black font-mono">{money(totals.sumAfter)} ₽</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="text-[10px] font-black uppercase text-gray-400">Скидка</div>
              <div className="font-black font-mono text-red-700">{money(totals.discount)} ₽</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="text-[10px] font-black uppercase text-gray-400">Средняя</div>
              <div className="font-black font-mono">{pct(totals.avgPct)}</div>
            </div>
          </div>
        </div>

        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-100 text-black border-b-2 border-black text-[10px] uppercase tracking-widest">
            <tr>
              <th className="px-3 py-2 w-28">Дата</th>
              <th className="px-3 py-2 w-40">Накладная</th>
              <th className="px-3 py-2">Клиент</th>
              <th className="px-3 py-2 text-right w-32">До</th>
              <th className="px-3 py-2 text-right w-32">После</th>
              <th className="px-3 py-2 text-right w-32">Скидка</th>
              <th className="px-3 py-2 text-right w-24">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map(r => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-mono">{format(new Date(r.date), 'dd.MM.yyyy')}</td>
                <td className="px-3 py-2 font-bold">{r.invoice}</td>
                <td className="px-3 py-2">
                  <div className="font-bold">{r.client}</div>
                  <div className="text-[10px] font-bold text-gray-500">{r.phone}</div>
                </td>
                <td className="px-3 py-2 text-right font-mono">{money(r.sumBefore)}</td>
                <td className="px-3 py-2 text-right font-mono">{money(r.sumAfter)}</td>
                <td className="px-3 py-2 text-right font-mono font-black text-red-700">{money(r.discount)}</td>
                <td className="px-3 py-2 text-right font-mono">{pct(r.discountPct)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400 font-bold">
                  Нет скидочных заказов за выбранный период
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Ответственный: {currentUser?.username || '—'} • Сформировано: {format(new Date(), 'dd.MM.yyyy HH:mm')}
        </div>
      </div>
    </div>
  );
};