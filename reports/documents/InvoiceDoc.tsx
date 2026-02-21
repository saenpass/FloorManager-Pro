import React from 'react';
import { format } from 'date-fns';
import { money } from '../utils/money';
import type { Order } from '../../types';

export const InvoiceDoc: React.FC<{
  order: Order;
  totals: { sum: number; total: number; discount: number; paid: number; debt: number };
  generatedAt?: Date;
}> = ({ order, totals, generatedAt = new Date() }) => {
  return (
    <div className="bg-white">
      <div className="mb-6 border-b-2 border-black pb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-2xl font-black uppercase tracking-tight">НАКЛАДНАЯ</div>
            <div className="text-xs font-bold text-gray-600 mt-1">
              № {order.invoice_number} от {format(new Date(order.order_date), 'dd.MM.yyyy')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black italic">FloorManager Pro</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase">Товарный документ</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-[10px] font-black uppercase text-gray-400">Покупатель</div>
            <div className="font-black">{order.client_name}</div>
            <div className="text-xs font-bold text-gray-600">{order.client_phone}</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-[10px] font-black uppercase text-gray-400">Адрес доставки</div>
            <div className="font-bold text-gray-800">{order.delivery_address || '-'}</div>
          </div>
        </div>
      </div>

      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-gray-100 text-black border-b-2 border-black text-[10px] uppercase tracking-widest">
          <tr>
            <th className="px-3 py-2 w-12">№</th>
            <th className="px-3 py-2">Позиция</th>
            <th className="px-3 py-2 w-28">Категория</th>
            <th className="px-3 py-2 w-20 text-right">Кол-во</th>
            <th className="px-3 py-2 w-24 text-right">Цена</th>
            <th className="px-3 py-2 w-28 text-right">Сумма</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {(order.items || []).map((it, idx) => (
            <tr key={it.id}>
              <td className="px-3 py-2 font-mono">{idx + 1}</td>
              <td className="px-3 py-2 font-bold">{it.position_name}</td>
              <td className="px-3 py-2 text-xs font-bold text-gray-600">{it.category_name}</td>
              <td className="px-3 py-2 text-right font-mono">{Number(it.quantity).toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-mono">{Number(it.price).toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-mono font-bold">{Number(it.total_price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-md border border-black rounded-lg p-4">
          <div className="flex justify-between text-sm font-bold">
            <span>Сумма без скидки</span>
            <span className="font-mono">{money(totals.sum)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-red-700">
            <span>Скидка</span>
            <span className="font-mono">{money(totals.discount)}</span>
          </div>
          <div className="flex justify-between text-base font-black mt-2 border-t border-gray-300 pt-2">
            <span>ИТОГО</span>
            <span className="font-mono">{money(totals.total)} ₽</span>
          </div>
          <div className="flex justify-between text-sm font-bold mt-2">
            <span>Оплачено</span>
            <span className="font-mono">{money(totals.paid)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-blue-900">
            <span>К оплате</span>
            <span className="font-mono">{money(Math.max(0, totals.debt))}</span>
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-10 text-sm">
        <div className="border-b border-black pb-2">
          <div className="text-[10px] font-black uppercase text-gray-400 mb-6">Отпустил</div>
          <div className="flex justify-between items-end">
            <span className="font-bold">__________________________</span>
            <span className="font-bold">/ __________ /</span>
          </div>
        </div>
        <div className="border-b border-black pb-2">
          <div className="text-[10px] font-black uppercase text-gray-400 mb-6">Получил</div>
          <div className="flex justify-between items-end">
            <span className="font-bold">__________________________</span>
            <span className="font-bold">/ __________ /</span>
          </div>
        </div>
      </div>

      <div className="mt-10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        Сформировано: {format(generatedAt, 'dd.MM.yyyy HH:mm')}
      </div>
    </div>
  );
};