
import React, { useState, useMemo, useRef } from 'react';
import { Search, Users, CreditCard, ExternalLink, TrendingDown, ShieldAlert, X, Check, Phone, AlertTriangle, Info, Skull, ChevronRight, FileDown, FileUp, Printer, MoreHorizontal, Download, ArrowUpDown, Banknote } from 'lucide-react';
import { db } from '../db';
import { useStore } from '../store';
import { translations } from '../translations';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import * as XLSX from 'xlsx';

type DebtConfirmStep = 'input' | 'summary' | 'final' | 'none';
type SortType = 'debt' | 'name' | 'date';

export const Debtors = () => {
  const { language, openTab } = useStore();
  const t = translations[language];
  const locale = language === 'ru' ? ru : enUS;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState<SortType>('debt');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newPayment, setNewPayment] = useState('');
  const [confirmStep, setConfirmStep] = useState<DebtConfirmStep>('none');
  const [isExporting, setIsExporting] = useState(false);

  const allOrders = db.getOrders();
  
  const debtors = useMemo(() => {
    let result = allOrders.filter(o => {
      if (o.is_deleted || o.cargo_status_id === 1) return false;
      
      const total = o.items?.reduce((acc, item) => acc + parseFloat(item.total_price), 0) || 0;
      const debt = total - parseFloat(o.prepayment || '0');
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        o.client_name.toLowerCase().includes(search) || 
        (o.invoice_number || '').toLowerCase().includes(search) ||
        (o.client_phone || '').toLowerCase().includes(search);
      return debt > 0.01 && matchesSearch;
    });

    result.sort((a, b) => {
      if (sortType === 'debt') {
        const debtA = (a.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0) - parseFloat(a.prepayment);
        const debtB = (b.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0) - parseFloat(b.prepayment);
        return debtB - debtA;
      } else if (sortType === 'name') {
        return a.client_name.localeCompare(b.client_name);
      } else {
        return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
      }
    });

    return result;
  }, [allOrders, searchTerm, sortType]);

  const totalDebtSum = useMemo(() => {
    return debtors.reduce((acc, o) => {
      const total = o.items?.reduce((iAcc, item) => iAcc + parseFloat(item.total_price), 0) || 0;
      return acc + (total - parseFloat(o.prepayment));
    }, 0);
  }, [debtors]);

  const selectedOrder = useMemo(() => 
    selectedOrderId ? allOrders.find(o => o.id === selectedOrderId) : null
  , [selectedOrderId, allOrders]);

  const selectedOrderTotals = useMemo(() => {
    if (!selectedOrder) return { sum: 0, discount: 0, total: 0, debt: 0 };
    const sum = selectedOrder.items?.reduce((acc, i) => acc + (i.quantity * parseFloat(i.price)), 0) || 0;
    const total = selectedOrder.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0;
    const debt = total - parseFloat(selectedOrder.prepayment);
    return { sum, discount: sum - total, total, debt };
  }, [selectedOrder]);

  const closeModals = () => {
    setSelectedOrderId(null);
    setConfirmStep('none');
    setNewPayment('');
  };

  const handleFinalPayment = () => {
    if (!selectedOrder || !newPayment) return;
    const paymentAmount = parseFloat(newPayment);
    const currentPrepayment = parseFloat(selectedOrder.prepayment);
    const updatedPrepayment = (currentPrepayment + paymentAmount).toFixed(2);
    const remainingDebt = selectedOrderTotals.total - parseFloat(updatedPrepayment);
    const shouldComplete = remainingDebt <= 0.01;
    
    db.updateOrder(selectedOrder.id, {
      prepayment: updatedPrepayment,
      note: shouldComplete ? `Status: ${t.statuses.client}` : selectedOrder.note,
      cargo_status_id: shouldComplete ? 8 : (selectedOrder.cargo_status_id === 1 ? 1 : selectedOrder.cargo_status_id),
      is_completed: shouldComplete
    });

    toast.success(shouldComplete ? "Долг полностью погашен!" : "Оплата принята");
    closeModals();
    window.dispatchEvent(new Event('storage'));
  };

  const exportToXLSX = () => {
    setIsExporting(true);
    try {
      const data = debtors.map(o => {
        const total = o.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0;
        const debt = total - parseFloat(o.prepayment);
        return {
          'Накладная': o.invoice_number,
          'Клиент': o.client_name,
          'Телефон': o.client_phone,
          'Дата': format(new Date(o.order_date), 'dd.MM.yyyy'),
          'Сумма заказа': total,
          'Оплачено': parseFloat(o.prepayment),
          'Долг': debt
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Debtors");
      XLSX.writeFile(workbook, `Debtors_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success("Excel отчет сформирован");
    } catch (e) { toast.error("Ошибка экспорта"); }
    finally { setIsExporting(false); }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 flex flex-col h-full bg-white">
      {/* HEADER SECTION - COMPACT 1C STYLE */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-100 text-white">
             <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none italic">
              {t.debtors}
            </h2>
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Активных долгов: {debtors.length}
              </span>
            </div>
          </div>
        </div>

        {/* COMPACT DEBT DISPLAY */}
        <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100 flex items-center gap-4 shadow-sm">
           <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
              <Banknote size={18} />
           </div>
           <div>
              <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-0.5">Общий итог:</p>
              <div className="text-xl font-black text-red-700 font-mono leading-none">
                {totalDebtSum.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} <span className="text-xs">₽</span>
              </div>
           </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex gap-3 mb-6 print:hidden items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Поиск по ФИО, № накладной..."
            className="w-full pl-11 pr-4 py-3 border border-gray-100 rounded-2xl focus:border-red-500 focus:ring-4 focus:ring-red-500/5 focus:outline-none text-sm font-bold shadow-inner transition-all bg-gray-50/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-sm">
          <ArrowUpDown size={14} className="ml-3 text-gray-400" />
          <select 
            className="bg-transparent border-none px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-gray-600"
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
          >
            <option value="debt">По сумме долга</option>
            <option value="name">По алфавиту</option>
            <option value="date">По дате</option>
          </select>
        </div>

        <button 
          onClick={handlePrint}
          className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm active:scale-95"
        >
          <Printer size={16} className="text-blue-600" /> Печать / PDF
        </button>
        
        <button 
          onClick={exportToXLSX}
          disabled={isExporting}
          className="bg-emerald-600 text-white px-5 py-3 rounded-xl hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-100 active:scale-95"
        >
          <FileDown size={16} /> Excel
        </button>
      </div>

      {/* --- PRINT ONLY PDF HEADER --- */}
      <div className="hidden print:block mb-10 border-b-2 border-black pb-6">
         <div className="flex justify-between items-start">
            <div>
               <h1 className="text-3xl font-black uppercase tracking-tight">ВЕДОМОСТЬ ЗАДОЛЖЕННОСТИ</h1>
               <p className="text-xs font-bold text-gray-500 mt-1 uppercase">Инвентаризация дебиторской задолженности на {format(new Date(), 'dd.MM.yyyy HH:mm')}</p>
            </div>
            <div className="text-right">
               <div className="text-2xl font-black italic">FloorManager Pro</div>
               <p className="text-[9px] font-bold uppercase text-gray-400">Автоматизированная система управления</p>
            </div>
         </div>
         <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-gray-100 p-4 rounded-lg">
               <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Общая сумма к получению:</p>
               <p className="text-2xl font-black font-mono">{totalDebtSum.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
               <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Количество должников:</p>
               <p className="text-2xl font-black font-mono">{debtors.length} чел.</p>
            </div>
         </div>
      </div>

      {/* DEBTORS TABLE */}
      <div className="flex-1 overflow-auto border border-red-50 rounded-2xl shadow-inner no-scrollbar print:border-none print:rounded-none">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 text-gray-400 font-black border-b border-gray-100 text-[10px] uppercase tracking-widest sticky top-0 z-10 print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
            <tr>
              <th className="px-6 py-4 w-32">Накладная</th>
              <th className="px-6 py-4">{t.clientName}</th>
              <th className="px-6 py-4">Дата заказа</th>
              <th className="px-6 py-4 text-right">СУММА</th>
              <th className="px-6 py-4 text-right">ОПЛАЧЕНО</th>
              <th className="px-6 py-4 text-right text-red-600 print:text-black">ДОЛГ</th>
              <th className="px-6 py-4 text-right print:hidden">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 print:divide-black">
            {debtors.map((order) => {
              const total = order.items?.reduce((acc, item) => acc + parseFloat(item.total_price), 0) || 0;
              const paid = parseFloat(order.prepayment);
              const debt = total - paid;
              
              return (
                <tr key={order.id} className="hover:bg-red-50/30 transition-colors group print:break-inside-avoid">
                  <td className="px-6 py-4 font-mono font-bold text-blue-900 text-sm print:text-black">{order.invoice_number}</td>
                  <td className="px-6 py-4">
                    <div className="font-black text-gray-900 uppercase tracking-tight text-base print:text-sm">{order.client_name}</div>
                    <div className="text-[9px] text-gray-400 font-bold flex items-center gap-1 uppercase mt-0.5 print:hidden">
                       <Phone size={10} className="text-red-500" /> {order.client_phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-bold text-[11px] print:text-black">
                    {format(new Date(order.order_date), 'dd.MM.yyyy', { locale })}
                  </td>
                  <td className="px-6 py-4 font-mono text-right text-gray-400 text-xs print:text-black">{total.toFixed(2)}</td>
                  <td className="px-6 py-4 font-mono text-right text-emerald-600 text-xs print:text-black">{paid.toFixed(2)}</td>
                  <td className="px-6 py-4 font-mono text-right text-red-600 font-black text-lg tracking-tighter print:text-black">
                    {debt.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 print:hidden">
                    <button 
                      onClick={() => { setSelectedOrderId(order.id); setConfirmStep('input'); }}
                      className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all text-[10px] font-black uppercase tracking-widest shadow-md active:scale-90"
                    >
                      <CreditCard size={14} /> Оплатить
                    </button>
                    <button 
                      onClick={() => openTab('order-edit', `${order.invoice_number}`, { orderId: order.id })}
                      className="p-2.5 text-gray-300 hover:text-blue-600 transition-colors bg-gray-50 rounded-xl hover:bg-blue-50"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {debtors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 text-gray-300">
             <Check size={64} className="opacity-10 mb-4" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em]">Все долги погашены!</p>
          </div>
        )}
      </div>

      {/* --- PRINT ONLY FOOTER --- */}
      <div className="hidden print:block mt-20 border-t-2 border-black pt-10">
         <div className="flex justify-between font-black uppercase tracking-tighter text-2xl">
            <span>ИТОГО К ЗАЧИСЛЕНИЮ:</span>
            <span className="font-mono">{totalDebtSum.toLocaleString('ru-RU')} ₽</span>
         </div>
         <div className="mt-20 flex justify-between gap-12">
            <div className="flex-1 border-b border-black pb-2">
               <p className="text-[8px] font-black uppercase text-gray-400 mb-6">Подпись ответственного лица</p>
               <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold">__________________________</span>
                  <span className="text-[10px] font-bold">/ {useStore.getState().currentUser?.username} /</span>
               </div>
            </div>
            <div className="w-48 border-b border-black pb-2 text-center flex flex-col justify-end">
               <p className="text-[10px] font-black uppercase">М.П.</p>
            </div>
         </div>
      </div>

      {/* --- PAYMENT MODALS (STRICT 1C STYLE) --- */}
      
      {selectedOrder && confirmStep !== 'none' && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md animate-in fade-in duration-300" onClick={closeModals} />
          
          {confirmStep === 'input' && (
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-red-50">
              <div className="p-6 border-b flex justify-between items-center bg-red-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg">
                     <CreditCard size={20} />
                  </div>
                  <h3 className="text-lg font-black text-red-900 uppercase tracking-tighter">Погашение долга</h3>
                </div>
                <button onClick={closeModals} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                      <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Клиент</div>
                      <div className="font-black text-blue-900 truncate uppercase text-[11px]">{selectedOrder.client_name}</div>
                   </div>
                   <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-right">
                      <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Накладная</div>
                      <div className="font-mono font-black text-gray-900 text-[11px]">{selectedOrder.invoice_number}</div>
                   </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 mb-2 uppercase tracking-widest px-1">Сумма платежа (₽)</label>
                  <input 
                    type="number" 
                    autoFocus
                    className="w-full p-6 border-none rounded-3xl bg-gray-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none text-4xl font-black text-red-700 font-mono shadow-inner text-center" 
                    placeholder="0.00"
                    value={newPayment} 
                    onChange={(e) => setNewPayment(e.target.value)} 
                  />
                  <div className="mt-4 flex justify-between px-2">
                     <span className="text-[9px] font-black text-gray-400 uppercase">Остаток по накладной: {selectedOrderTotals.debt.toFixed(2)}</span>
                     <button 
                       onClick={() => setNewPayment(selectedOrderTotals.debt.toFixed(2))}
                       className="text-[9px] font-black text-blue-600 uppercase hover:underline"
                     >
                       Внести всё
                     </button>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex gap-3">
                <button 
                  onClick={() => setConfirmStep('summary')} 
                  disabled={!newPayment || parseFloat(newPayment) <= 0}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  Далее <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {confirmStep === 'summary' && (
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-blue-600">
               <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
                <div className="flex items-center gap-3">
                   <Info size={24} />
                   <h3 className="text-lg font-black uppercase tracking-tighter">Проверка расчета</h3>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
                   <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Будет внесено</div>
                   <div className="text-4xl font-black text-emerald-700 font-mono tracking-tighter">
                      {parseFloat(newPayment || '0').toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                   </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Остаток после:</span>
                    <span className="font-mono text-xl font-black text-blue-900">
                       {Math.max(0, selectedOrderTotals.debt - parseFloat(newPayment || '0')).toFixed(2)}
                    </span>
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex gap-3">
                <button onClick={() => setConfirmStep('input')} className="flex-1 bg-white border border-gray-200 text-gray-500 py-4 rounded-2xl font-black hover:bg-gray-100 transition-all uppercase text-[10px] tracking-widest">Назад</button>
                <button onClick={() => setConfirmStep('final')} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200 uppercase text-[10px] tracking-widest active:scale-95">Принять</button>
              </div>
            </div>
          )}

          {confirmStep === 'final' && (
            <div className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-8 border-red-600">
              <div className="p-10 bg-red-600 text-white flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                   <Skull size={48} className="text-white" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter italic">ПОДТВЕРДИТЕ!</h3>
                <p className="text-[10px] font-bold uppercase opacity-80 leading-relaxed">Действие будет занесено в журнал кассовых операций</p>
              </div>
              <div className="p-8 bg-gray-50 border-t flex gap-3">
                <button onClick={() => setConfirmStep('summary')} className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black hover:bg-gray-100 transition-all uppercase text-[10px] tracking-widest">Назад</button>
                <button onClick={handleFinalPayment} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-red-400 hover:bg-red-700 transition-all uppercase text-[10px] tracking-widest animate-blink">ДА, ПРИНЯТО</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
