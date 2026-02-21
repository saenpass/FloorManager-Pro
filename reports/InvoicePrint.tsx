import React, { useMemo, useState } from 'react';
import { Search, Printer } from 'lucide-react';
import { db } from '../db';
import { useStore } from '../store';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const InvoicePrint: React.FC<{ orderId?: number }> = ({ orderId }) => {
  const { openTab } = useStore();
  const [search, setSearch] = useState('');

  const orders = db.getOrders().filter(o => !o.is_deleted);

  const selectedOrder = useMemo(() => {
    if (orderId) return db.getOrderById(orderId);
    // если orderId не передан — можно выбрать первый найденный по поиску
    return null;
  }, [orderId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return orders.slice(0, 50);
    return orders.filter(o =>
      (o.invoice_number || '').toLowerCase().includes(s) ||
      o.client_name.toLowerCase().includes(s) ||
      (o.client_phone || '').toLowerCase().includes(s)
    ).slice(0, 50);
  }, [orders, search]);

  const totals = useMemo(() => {
    if (!selectedOrder) return { sum: 0, total: 0, discount: 0, paid: 0, debt: 0 };

    const sum = selectedOrder.items?.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.price)), 0) || 0;
    const total = selectedOrder.items?.reduce((acc, i) => acc + Number(i.total_price), 0) || 0;
    const paid = Number(selectedOrder.prepayment || '0');
    const debt = total - paid;
    const discount = sum - total;
    return { sum, total, discount, paid, debt };
  }, [selectedOrder]);

  const handlePrint = () => {
    if (!selectedOrder) return toast.error('Выберите заказ для печати');
    window.print();
  };

  return (
    <div className="p-6 flex flex-col h-full bg-white">
      {/* Панель управления */}
      <div className="print:hidden flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по накладной / клиенту / телефону..."
            className="w-full pl-11 pr-4 py-3 border border-gray-100 rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
          />
        </div>

        <button
          onClick={handlePrint}
          className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95"
        >
          <Printer size={16} className="text-blue-600" /> Печать / PDF
        </button>
      </div>

      {/* Быстрый выбор заказа (если orderId не передали) */}
      {!orderId && (
        <div className="print:hidden mb-4 border border-gray-100 rounded-2xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
            Быстрый выбор заказа
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.map(o => (
              <button
                key={o.id}
                onClick={() => openTab('invoice-print', `Накладная ${o.invoice_number}`, { orderId: o.id })}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-t border-gray-50"
              >
                <div className="flex justify-between gap-3">
                  <div className="font-black text-gray-900">{o.invoice_number}</div>
                  <div className="text-xs font-bold text-gray-500">{format(new Date(o.order_date), 'dd.MM.yyyy')}</div>
                </div>
                <div className="text-xs font-bold text-gray-600">{o.client_name} • {o.client_phone}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================== ПЕЧАТНАЯ ОБЛАСТЬ ===================== */}
      {selectedOrder && (
        <div id="print-area" className="bg-white">
          {/* Шапка */}
          <div className="mb-6 border-b-2 border-black pb-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-black uppercase tracking-tight">НАКЛАДНАЯ</div>
                <div className="text-xs font-bold text-gray-600 mt-1">
                  № {selectedOrder.invoice_number} от {format(new Date(selectedOrder.order_date), 'dd.MM.yyyy')}
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
                <div className="font-black">{selectedOrder.client_name}</div>
                <div className="text-xs font-bold text-gray-600">{selectedOrder.client_phone}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-[10px] font-black uppercase text-gray-400">Адрес доставки</div>
                <div className="font-bold text-gray-800">{selectedOrder.delivery_address || '-'}</div>
              </div>
            </div>
          </div>

          {/* Таблица */}
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
              {(selectedOrder.items || []).map((it, idx) => (
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

          {/* Итоги */}
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-md border border-black rounded-lg p-4">
              <div className="flex justify-between text-sm font-bold">
                <span>Сумма без скидки</span>
                <span className="font-mono">{totals.sum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-red-700">
                <span>Скидка</span>
                <span className="font-mono">{totals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black mt-2 border-t border-gray-300 pt-2">
                <span>ИТОГО</span>
                <span className="font-mono">{totals.total.toFixed(2)} ₽</span>
              </div>
              <div className="flex justify-between text-sm font-bold mt-2">
                <span>Оплачено</span>
                <span className="font-mono">{totals.paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-blue-900">
                <span>К оплате</span>
                <span className="font-mono">{Math.max(0, totals.debt).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Подписи */}
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
            Сформировано: {format(new Date(), 'dd.MM.yyyy HH:mm')}
          </div>
        </div>
      )}

      {!selectedOrder && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Выберите заказ для формирования накладной
        </div>
      )}
    </div>
  );
};