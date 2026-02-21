import React, { useMemo, useState } from 'react';
import { Search, Printer, CalendarDays } from 'lucide-react';
import { db } from '../db';
import { useStore } from '../store';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type ClientKey = string; // "name|phone"

const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseISODate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const money = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const Reconciliation: React.FC = () => {
  const { currentUser } = useStore();

  const allOrders = db.getOrders().filter(o => !o.is_deleted);

  // уникальные клиенты
  const clients = useMemo(() => {
    const m = new Map<ClientKey, { name: string; phone: string; ordersCount: number }>();
    for (const o of allOrders) {
      const name = (o.client_name || '').trim();
      const phone = (o.client_phone || '').trim();
      if (!name) continue;
      const key = `${name}|${phone}`;
      const prev = m.get(key);
      m.set(key, { name, phone, ordersCount: (prev?.ordersCount || 0) + 1 });
    }
    return Array.from(m.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.ordersCount - a.ordersCount || a.name.localeCompare(b.name));
  }, [allOrders]);

  const [clientSearch, setClientSearch] = useState('');
  const filteredClients = useMemo(() => {
    const s = clientSearch.trim().toLowerCase();
    if (!s) return clients.slice(0, 50);
    return clients
      .filter(c =>
        c.name.toLowerCase().includes(s) ||
        (c.phone || '').toLowerCase().includes(s)
      )
      .slice(0, 50);
  }, [clients, clientSearch]);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [selectedClientKey, setSelectedClientKey] = useState<ClientKey | null>(null);
  const [dateFrom, setDateFrom] = useState(format(monthStart, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(today, 'yyyy-MM-dd'));

  const selectedClient = useMemo(() => {
    if (!selectedClientKey) return null;
    const [name, phone] = selectedClientKey.split('|');
    return { name, phone };
  }, [selectedClientKey]);

  const rows = useMemo(() => {
    if (!selectedClient) return [];
    const from = parseISODate(dateFrom);
    const to = parseISODate(dateTo);
    const fromD = from ? toDateOnly(from) : null;
    const toD = to ? toDateOnly(to) : null;

    const list = allOrders
      .filter(o => {
        if (o.is_deleted) return false;
        if (o.client_name.trim() !== selectedClient.name.trim()) return false;
        // телефон может быть пустым/разным — если выбранный телефон задан, учитываем
        if ((selectedClient.phone || '').trim() && (o.client_phone || '').trim() !== (selectedClient.phone || '').trim()) return false;

        const od = parseISODate(o.order_date);
        if (!od) return false;
        const d = toDateOnly(od);
        if (fromD && d < fromD) return false;
        if (toD && d > toD) return false;
        return true;
      })
      .map(o => {
        const total = o.items?.reduce((acc, i) => acc + Number(i.total_price), 0) || 0;
        const paid = Number(o.prepayment || '0');
        return {
          id: o.id,
          date: o.order_date,
          invoice: o.invoice_number || `№${o.id}`,
          total,
          paid
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // считаем сальдо нарастающим итогом
    let saldo = 0;
    return list.map(r => {
      saldo += (r.total - r.paid);
      return { ...r, saldo };
    });
  }, [allOrders, selectedClient, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const charged = rows.reduce((acc, r) => acc + r.total, 0);
    const paid = rows.reduce((acc, r) => acc + r.paid, 0);
    const saldo = charged - paid;
    return { charged, paid, saldo };
  }, [rows]);

  const handlePrint = () => {
    if (!selectedClient) return toast.error('Выберите клиента');
    window.print();
  };

  return (
    <div className="p-6 flex flex-col h-full bg-white">
      {/* Панель управления */}
      <div className="print:hidden flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Поиск клиента по имени/телефону..."
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-1 bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
              Клиенты
            </div>
            <div className="max-h-56 overflow-auto">
              {filteredClients.map(c => (
                <button
                  key={c.key}
                  onClick={() => setSelectedClientKey(c.key)}
                  className={`w-full text-left px-4 py-3 border-t border-gray-50 hover:bg-blue-50 ${
                    selectedClientKey === c.key ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div className="font-black text-gray-900">{c.name}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase">{c.ordersCount}</div>
                  </div>
                  <div className="text-xs font-bold text-gray-600">{c.phone || '—'}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
              <CalendarDays size={14} /> Период
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

            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Выбран клиент</div>
              <div className="text-lg font-black text-gray-900 mt-1">
                {selectedClient ? selectedClient.name : '—'}
              </div>
              <div className="text-xs font-bold text-gray-600">{selectedClient?.phone || ''}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ПЕЧАТНЫЙ ДОКУМЕНТ */}
      {selectedClient ? (
        <div id="print-area">
          <div className="mb-6 border-b-2 border-black pb-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-black uppercase tracking-tight">АКТ СВЕРКИ ВЗАИМОРАСЧЁТОВ</div>
                <div className="text-xs font-bold text-gray-600 mt-1">
                  Период: {format(new Date(dateFrom), 'dd.MM.yyyy')} — {format(new Date(dateTo), 'dd.MM.yyyy')}
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
                <div className="font-black">{selectedClient.name}</div>
                <div className="text-xs font-bold text-gray-600">{selectedClient.phone || '—'}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-[10px] font-black uppercase text-gray-400">Ответственный</div>
                <div className="font-black">{currentUser?.username || '—'}</div>
                <div className="text-xs font-bold text-gray-600">Сформировано: {format(new Date(), 'dd.MM.yyyy HH:mm')}</div>
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
                <span className="font-bold">/ {currentUser?.username || '________'} /</span>
              </div>
            </div>
            <div className="border-b border-black pb-2">
              <div className="text-[10px] font-black uppercase text-gray-400 mb-6">Со стороны покупателя</div>
              <div className="flex justify-between items-end">
                <span className="font-bold">__________________________</span>
                <span className="font-bold">/ {selectedClient.name} /</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Выберите клиента для формирования акта сверки
        </div>
      )}
    </div>
  );
};