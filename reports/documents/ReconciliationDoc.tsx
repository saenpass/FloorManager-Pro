import React from 'react';
import { format } from 'date-fns';
import { money } from '../utils/money';

export type ReconciliationRow = {
  id: number;
  date: string;      // YYYY-MM-DD
  invoice: string;
  total: number;     // начислено
  paid: number;      // оплачено
  saldo: number;     // сальдо нарастающим
};

export const ReconciliationDoc: React.FC<{
  client: { name: string; phone: string };
  period: { dateFrom: string; dateTo: string };
  responsible: string;
  rows: ReconciliationRow[];
  totals: { charged: number; paid: number; saldo: number };
  generatedAt?: Date;
}> = ({ client, period, responsible, rows, totals, generatedAt = new Date() }) => {
  return (
    <div className="bg-white">
      <div className="mb-6 border-b-2 border-black pb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-2xl font-black uppercase tracking-tight">АКТ СВЕРКИ ВЗАИМОРАСЧЁТОВ</div>
            <div className="text-xs font-bold text-gray-600 mt-1">
              Период: {format(new Date(period.dateFrom), 'dd.MM.yyyy')} — {format(new Date(period.dateTo), 'dd.MM.yyyy')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black italic">FloorManager Pro</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase">Отчётный документ</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-[10px] font-black uppercase text-gray-400">Контрагент</div>
            <div className="font-black">{client.name}</div>
            <div className="text-xs font-bold text-gray-600">{client.phone || '—'}</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-[10px] font-black uppercase text-gray-400">Ответственный</div>
            <div className="font-black">{responsible || '—'}</div>
            <div className="text-xs font-bold text-gray-600">Сформировано: {format(generatedAt, 'dd.MM.yyyy HH:mm')}</div>
          </div>
        </div>
      </div>

      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-gray-100 text-black border-b-2 border-black text-[10px] uppercase tracking-widest">
          <tr>
            <th className="px-3 py-2 w-28">Дата</th>
            <th className="px-3 py-2 w-40">Документ</th>
            <th className="px-3 py-2 text-right w-32">Начислено</th>
            <th className="px-3 py-2 text-right w-32">Оплачено</th>
            <th className="px-3 py-2 text-right w-36">Сальдо</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map(r => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-mono">{format(new Date(r.date), 'dd.MM.yyyy')}</td>
              <td className="px-3 py-2 font-bold">{r.invoice}</td>
              <td className="px-3 py-2 text-right font-mono">{money(r.total)}</td>
              <td className="px-3 py-2 text-right font-mono">{money(r.paid)}</td>
              <td className="px-3 py-2 text-right font-mono font-black">{money(r.saldo)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-3 py-8 text-center text-gray-400 font-bold" colSpan={5}>
                Нет операций за выбранный период
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-md border border-black rounded-lg p-4">
          <div className="flex justify-between text-sm font-bold">
            <span>Начислено</span>
            <span className="font-mono">{money(totals.charged)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span>Оплачено</span>
            <span className="font-mono">{money(totals.paid)}</span>
          </div>
          <div className="flex justify-between text-base font-black mt-2 border-t border-gray-300 pt-2">
            <span>Сальдо на конец</span>
            <span className="font-mono">{money(totals.saldo)} ₽</span>
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-10 text-sm">
        <div className="border-b border-black pb-2">
          <div className="text-[10px] font-black uppercase text-gray-400 mb-6">Со стороны поставщика</div>
          <div className="flex justify-between items-end">
            <span className="font-bold">__________________________</span>
            <span className="font-bold">/ {responsible || '________'} /</span>
          </div>
        </div>
        <div className="border-b border-black pb-2">
          <div className="text-[10px] font-black uppercase text-gray-400 mb-6">Со стороны покупателя</div>
          <div className="flex justify-between items-end">
            <span className="font-bold">__________________________</span>
            <span className="font-bold">/ {client.name} /</span>
          </div>
        </div>
      </div>
    </div>
  );
};