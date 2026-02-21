
import React, { useState, useRef, useMemo } from 'react';
import { Search, FileDown, Edit2, Trash2, FileUp, MoreHorizontal, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle, Download, ShieldAlert, Skull, Check, Wallet } from 'lucide-react';
import { db } from '../db';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useStore } from '../store';
import { translations } from '../translations';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type SortField = 'id' | 'client_name' | 'order_date' | 'total';
type SortOrder = 'asc' | 'desc';

export const OrderList = () => {
  const { language, openTab } = useStore();
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  // Modal State
  const [clearConfirmStep, setClearConfirmStep] = useState<0 | 1 | 2>(0);
  const [isExporting, setIsExporting] = useState(false);

  const statuses = useMemo(() => db.getCargoStatuses(), []);
  const allRawOrders = useMemo(() => db.getOrders(), []);
  
  const filteredAndSortedOrders = useMemo(() => {
    let result = allRawOrders.filter(o => {
      if (o.is_deleted) return false;
      const search = searchTerm.toLowerCase();
      return (
        o.client_name.toLowerCase().includes(search) || 
        (o.invoice_number || '').toLowerCase().includes(search) ||
        o.client_phone.includes(searchTerm)
      ) && (filterStatus === 'all' || o.cargo_status_id === Number(filterStatus));
    });

    result.sort((a, b) => {
      let comp = 0;
      if (sortField === 'id') comp = a.id - b.id;
      else if (sortField === 'client_name') comp = a.client_name.localeCompare(b.client_name);
      else if (sortField === 'order_date') comp = new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
      else if (sortField === 'total') {
        const tA = a.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0;
        const tB = b.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0;
        comp = tA - tB;
      }
      return sortOrder === 'desc' ? -comp : comp;
    });
    return result;
  }, [allRawOrders, searchTerm, filterStatus, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedOrders.slice(start, start + itemsPerPage);
  }, [filteredAndSortedOrders, currentPage, itemsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
    setCurrentPage(1);
  };

  // --- EXPORT LOGIC ---
  const exportFullExcel = () => {
    setIsExporting(true);
    try {
      // Sheet 1: Orders Summary
      const ordersData = filteredAndSortedOrders.map(o => {
        const total = o.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0;
        return {
          'ID': o.id,
          'Номер': o.invoice_number,
          'Дата': format(new Date(o.order_date), 'dd.MM.yyyy'),
          'Клиент': o.client_name,
          'Телефон': o.client_phone,
          'Адрес': o.delivery_address,
          'Статус': statuses.find(s => s.id === o.cargo_status_id)?.name || '...',
          'Сумма заказа': total,
          'Предоплата': parseFloat(o.prepayment),
          'Долг': total - parseFloat(o.prepayment),
          'Примечание': o.note
        };
      });

      // Sheet 2: Order Items Detail
      const itemsData: any[] = [];
      filteredAndSortedOrders.forEach(o => {
        o.items?.forEach(item => {
          itemsData.push({
            'Order ID': o.id,
            'Накладная': o.invoice_number,
            'Товар': item.position_name,
            'Категория': item.category_name,
            'Кол-во': item.quantity,
            'Цена': parseFloat(item.price),
            'Скидка %': parseFloat(item.discount),
            'Итого': parseFloat(item.total_price)
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const wsOrders = XLSX.utils.json_to_sheet(ordersData);
      const wsItems = XLSX.utils.json_to_sheet(itemsData);
      
      XLSX.utils.book_append_sheet(wb, wsOrders, "Журнал заказов");
      XLSX.utils.book_append_sheet(wb, wsItems, "Состав заказов");
      
      XLSX.writeFile(wb, `FloorManager_Export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
      toast.success("Excel-файл успешно сформирован");
    } catch (e) {
      toast.error("Ошибка при экспорте в Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const exportBackupJSON = () => {
    const data = db.getRawData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `Orders_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`);
    a.click();
    toast.success("Резервная копия скачана");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        const res = db.bulkAddOrders(data);
        toast.success(`Загружено: ${res.addedCount} заказов`);
        window.dispatchEvent(new Event('storage'));
      } catch (err) { toast.error("Ошибка формата файла"); }
    };
    reader.readAsText(file);
  };

  const executeFullClear = () => {
    db.clearOrders();
    toast.success("Журнал полностью очищен");
    setClearConfirmStep(0);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="p-6 flex flex-col h-full bg-white">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-900 uppercase tracking-tighter italic">Журнал заказов</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setClearConfirmStep(1)}
            className="border-2 border-red-100 text-red-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-50 transition-all"
          >
            <Trash2 size={18} /> Очистить всё
          </button>
          
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
          <button onClick={() => fileInputRef.current?.click()} className="border px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-all"><FileUp size={18} /> {t.import}</button>
          
          <div className="flex border-2 border-blue-50 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={exportFullExcel} 
              disabled={isExporting}
              className="bg-white text-gray-700 px-4 py-2 border-r hover:bg-emerald-50 hover:text-emerald-700 transition-all text-sm font-bold flex items-center gap-2"
            >
              <FileDown size={18} className="text-emerald-600" /> Excel
            </button>
            <button 
              onClick={exportBackupJSON}
              className="bg-white text-gray-700 px-3 py-2 hover:bg-blue-50 transition-all text-sm font-bold"
              title="Скачать JSON бэкап"
            >
              JSON
            </button>
          </div>

          <button onClick={() => openTab('order-create', t.newOrder)} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-black shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest">Создать заказ</button>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex gap-3 mb-6 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Поиск по ФИО, номеру или телефону..." className="w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none text-sm font-medium" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border">
          <span className="text-[10px] font-black text-gray-400 uppercase ml-2">На стр:</span>
          {[30, 50, 100].map(size => (
            <button 
              key={size}
              onClick={() => { setItemsPerPage(size); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${itemsPerPage === size ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-white'}`}
            >
              {size}
            </button>
          ))}
        </div>

        <select className="border rounded-xl px-4 py-2.5 text-xs font-black uppercase bg-gray-50" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
          <option value="all">{t.allStatuses}</option>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* DATA TABLE */}
      <div className="flex-1 overflow-auto border border-gray-100 rounded-2xl shadow-inner no-scrollbar">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 text-gray-400 font-bold border-b text-[10px] uppercase tracking-widest sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('id')}>ID {sortField === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('client_name')}>Клиент {sortField === 'client_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('order_date')}>Дата {sortField === 'order_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th className="px-6 py-4">Статус</th>
              <th className="px-6 py-4 text-right">Оплачено</th>
              <th className="px-6 py-4 text-right cursor-pointer" onClick={() => handleSort('total')}>Сумма {sortField === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th className="px-6 py-4 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedOrders.map((order) => {
              const total = order.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0;
              const prepayment = parseFloat(order.prepayment || '0');
              const status = statuses.find(s => s.id === order.cargo_status_id);
              return (
                <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-blue-900">{order.invoice_number || order.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{order.client_name}</div>
                    <div className="text-[10px] text-gray-400">{order.client_phone}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{format(new Date(order.order_date), 'dd.MM.yyyy')}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase" style={{ backgroundColor: status?.color + '20', color: status?.color }}>{status?.name}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`font-mono font-bold ${prepayment > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                      {prepayment.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-black text-blue-950">{total.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openTab('order-edit', `${order.invoice_number}`, { orderId: order.id })} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => { if(confirm(t.confirmDelete)) { db.deleteOrder(order.id); window.dispatchEvent(new Event('storage')); }}} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {paginatedOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 text-gray-300">
             <Trash2 size={64} className="opacity-10 mb-4" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em]">Список заказов пуст</p>
          </div>
        )}
      </div>

      {/* PAGINATION FOOTER */}
      <div className="mt-4 flex justify-between items-center bg-gray-50 p-4 rounded-xl border">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Найдено записей: <span className="text-blue-600">{filteredAndSortedOrders.length}</span>
        </span>
        <div className="flex gap-2 items-center">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={18}/></button>
          <div className="flex items-center gap-1">
            <span className="text-sm font-black px-3">{currentPage}</span>
            <span className="text-xs font-bold text-gray-400 uppercase">из {totalPages || 1}</span>
          </div>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 bg-white border rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={18}/></button>
        </div>
      </div>

      {/* CLEAR CONFIRMATION MODALS */}
      {clearConfirmStep > 0 && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setClearConfirmStep(0)} />
          
          {clearConfirmStep === 1 && (
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-orange-100">
               <div className="p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                    <AlertTriangle size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Очистка журнала</h3>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Вы собираетесь удалить ВСЕ заказы. Рекомендуем сначала скачать резервную копию.</p>
                  </div>
                  <div className="space-y-3">
                    <button 
                      onClick={() => { exportBackupJSON(); setClearConfirmStep(2); }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200"
                    >
                      <Download size={18} /> Скачать бэкап и продолжить
                    </button>
                    <button 
                      onClick={() => setClearConfirmStep(2)}
                      className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all uppercase text-[10px] tracking-widest"
                    >
                      Продолжить без бэкапа
                    </button>
                  </div>
                  <button onClick={() => setClearConfirmStep(0)} className="text-[10px] font-black uppercase text-gray-300 tracking-widest hover:text-blue-600">Отмена</button>
               </div>
            </div>
          )}

          {clearConfirmStep === 2 && (
            <div className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-8 border-red-600">
              <div className="p-10 bg-red-600 text-white flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                   <Skull size={48} className="text-white" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter italic">ПОДТВЕРДИТЕ!</h3>
                <p className="text-[11px] font-bold uppercase opacity-80 leading-relaxed">Это действие необратимо. Все заказы и их история будут стерты навсегда.</p>
              </div>
              <div className="p-8 bg-gray-50 border-t flex gap-3">
                <button onClick={() => setClearConfirmStep(0)} className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black hover:bg-gray-100 transition-all uppercase text-[10px] tracking-widest">Назад</button>
                <button 
                  onClick={executeFullClear}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-red-400 hover:bg-red-700 transition-all uppercase text-[10px] tracking-widest animate-blink"
                >
                  ДА, УДАЛИТЬ ВСЁ
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
