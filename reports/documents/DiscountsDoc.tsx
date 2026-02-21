import React from 'react';
import { format } from 'date-fns';
import { money, pct } from '../utils/money';

export type DiscountRow = {
  id: number;
  date: string;
  invoice: string;
  client: string;
  phone: string;
  sumBefore: number;
  sumAfter: number;
  discount: number;
  discountPct: number;
};

export const DiscountsDoc: React.FC<{
  period: { dateFrom: string; dateTo: string };
  totals: { sumBefore: number; sumAfter: number; discount: number; avgPct: number };
  rows: DiscountRow[];
  responsible: string;
  generatedAt?: Date;
}> = ({ period, totals, rows, responsible, generatedAt = new Date() }) => {
  return (
    <div className="bg-white">
      <div className="mb-6 border-b-2 border-black pb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-2xl font-black uppercase tracking-tight">ОТЧЁТ ПО СКИДКАМ</div>
            <div className="text-xs font-bold text-gray-600 mt-1">
              Период: {format(new Date(period.dateFrom), 'dd.MM.yyyy')} — {format(new Date(period.dateTo), 'dd.MM.yyyy')}
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
        Ответственный: {responsible || '—'} • Сформировано: {format(generatedAt, 'dd.MM.yyyy HH:mm')}
      </div>
    </div>
  );
};