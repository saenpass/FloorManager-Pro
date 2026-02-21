import React from 'react';
import { format } from 'date-fns';
import { money } from '../utils/money';

export type RevenueRow = {
  day: string;       // YYYY-MM-DD
  clients: number;   // уникальные клиенты за день
  revenue: number;
  paid: number;
  debt: number;
};

export const RevenueDoc: React.FC<{
  period: { dateFrom: string; dateTo: string };
  totals: { revenue: number; paid: number; debt: number };
  rows: RevenueRow[];
  responsible: string;
  generatedAt?: Date;
}> = ({ period, totals, rows, responsible, generatedAt = new Date() }) => {
  return (
    <div className="bg-white">
      <div className="mb-6 border-b-2 border-black pb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-2xl font-black uppercase tracking-tight">ОТЧЁТ ПО ВЫРУЧКЕ</div>
            <div className="text-xs font-bold text-gray-600 mt-1">
              Период: {format(new Date(period.dateFrom), 'dd.MM.yyyy')} — {format(new Date(period.dateTo), 'dd.MM.yyyy')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black italic">FloorManager Pro</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase">Управленческий отчёт</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-[10px] font-black uppercase text-gray-400">Выручка</div>
            <div className="font-black font-mono text-lg">{money(totals.revenue)} ₽</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-[10px] font-black uppercase text-gray-400">Оплачено</div>
            <div className="font-black font-mono text-lg">{money(totals.paid)} ₽</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-[10px] font-black uppercase text-gray-400">Дебиторка</div>
            <div className="font-black font-mono text-lg">{money(totals.debt)} ₽</div>
          </div>
        </div>
      </div>

      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-gray-100 text-black border-b-2 border-black text-[10px] uppercase tracking-widest">
          <tr>
            <th className="px-3 py-2 w-32">Дата</th>
            <th className="px-3 py-2 text-right w-28">Клиенты</th>
            <th className="px-3 py-2 text-right w-36">Выручка</th>
            <th className="px-3 py-2 text-right w-36">Оплачено</th>
            <th className="px-3 py-2 text-right w-36">Дебиторка</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map(r => (
            <tr key={r.day}>
              <td className="px-3 py-2 font-mono">{format(new Date(r.day), 'dd.MM.yyyy')}</td>
              <td className="px-3 py-2 text-right font-mono">{r.clients}</td>
              <td className="px-3 py-2 text-right font-mono font-bold">{money(r.revenue)}</td>
              <td className="px-3 py-2 text-right font-mono">{money(r.paid)}</td>
              <td className="px-3 py-2 text-right font-mono">{money(r.debt)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-gray-400 font-bold">
                Нет данных за выбранный период
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