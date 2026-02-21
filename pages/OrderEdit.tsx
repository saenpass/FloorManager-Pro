
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Save, Trash2, Plus, X, Check, Calendar, CreditCard, Archive, CheckCircle2, AlertTriangle, Info, ShieldAlert, Skull, TrendingDown, Phone, RefreshCcw, Search, Package, ChevronRight, Download, AlertCircle, Wallet } from 'lucide-react';
import { db } from '../db';
import { Order, OrderItem, Position, Category } from '../types';
import { useStore } from '../store';
import { translations } from '../translations';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const SearchableProductSelect = ({ 
  categoryId, 
  value, 
  onChange, 
  allPositions,
  fallbackName 
}: { 
  categoryId: number, 
  value: string, 
  onChange: (id: string) => void, 
  allPositions: Position[],
  fallbackName?: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const catPositions = allPositions.filter(p => p.categoryId === Number(categoryId));
    if (!search) return catPositions;
    return catPositions.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.brand.toLowerCase().includes(search.toLowerCase())
    );
  }, [categoryId, allPositions, search]);

  const selectedProduct = useMemo(() => 
    allPositions.find(p => p.id === Number(value))
  , [value, allPositions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-2.5 border rounded-xl bg-white text-sm cursor-pointer hover:border-blue-300 transition-all shadow-sm"
      >
        <span className={`truncate ${!selectedProduct && !fallbackName ? 'text-gray-400 italic' : 'text-blue-900 font-bold'}`}>
          {selectedProduct ? `${selectedProduct.brand} ${selectedProduct.name}` : (fallbackName || 'Выберите товар...')}
        </span>
        <Search size={14} className="text-gray-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-[100] top-full mt-1 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b bg-gray-50/50">
             <input 
               autoFocus
               type="text" 
               className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
               placeholder="Поиск..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
          </div>
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {filtered.length > 0 ? (
              filtered.map(p => (
                <div 
                  key={p.id}
                  onClick={() => {
                    onChange(p.id.toString());
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-4 py-3 text-xs cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-none flex flex-col gap-0.5 ${Number(value) === p.id ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                     <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.brand}</span>
                        <span className="font-bold text-gray-900 truncate block max-w-[200px]">{p.name}</span>
                     </div>
                     <span className="text-blue-600 font-mono font-black">{p.price} ₽</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const OrderEdit = ({ orderId }: { orderId: number }) => {
  const { language, closeTab, activeTabId } = useStore();
  const t = translations[language];

  const categories = useMemo(() => db.getCategories(), []);
  const allPositions = useMemo(() => db.getPositions(), []);
  const initialOrder = useMemo(() => db.getOrderById(orderId), [orderId]);
  
  const [orderDate, setOrderDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [prepayment, setPrepayment] = useState('0');
  const [shippingDate, setShippingDate] = useState('');
  const [orderStatus, setOrderStatus] = useState('');

  const [confirmType, setConfirmType] = useState<'full_payment' | 'complete_order' | 'none'>('none');
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (initialOrder) {
      setOrderDate(initialOrder.order_date);
      setClientName(initialOrder.client_name);
      setPhone(initialOrder.client_phone);
      setAddress(initialOrder.delivery_address);
      setPrepayment(initialOrder.prepayment || '0');
      setShippingDate(initialOrder.shipping_date || format(new Date(), 'yyyy-MM-dd'));
      setOrderStatus(initialOrder.note?.replace('Status: ', '') || t.statuses.preorder);

      const mappedItems = (initialOrder.items || []).map(item => {
        const pos = allPositions.find(p => Number(p.id) === Number(item.positionId));
        let catId = pos ? pos.categoryId : (categories.find(c => c.name === item.category_name)?.id || categories[0]?.id || '');
        
        return {
          ...item,
          categoryId: catId
        };
      });
      setSelectedItems(mappedItems);
    }
  }, [initialOrder, allPositions, categories, t.statuses.preorder]);

  const addItem = () => {
    setSelectedItems([...selectedItems, { 
      categoryId: categories[0]?.id || '', 
      positionId: '', 
      quantity: 1, 
      price: '0', 
      discount: '0', 
      total_price: '0' 
    }]);
  };

  const removeItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    const item = { ...newItems[idx], [field]: value };
    
    if (field === 'positionId') {
      const pos = allPositions.find(p => Number(p.id) === Number(value));
      if (pos) {
        item.price = pos.price;
        item.position_name = pos.name;
      }
    }

    const q = parseFloat(item.quantity?.toString() || '0');
    const p = parseFloat(item.price?.toString() || '0');
    const d = parseFloat(item.discount?.toString() || '0');
    item.total_price = (q * p * (1 - d / 100)).toFixed(2);
    
    newItems[idx] = item;
    setSelectedItems(newItems);
  };

  const totals = useMemo(() => {
    const sum = selectedItems.reduce((acc, item) => acc + (parseFloat(item.quantity) * parseFloat(item.price)), 0);
    const sumWithDiscount = selectedItems.reduce((acc, item) => acc + parseFloat(item.total_price), 0);
    const discountAmount = sum - sumWithDiscount;
    const debt = sumWithDiscount - parseFloat(prepayment || '0');
    return { sum, sumWithDiscount, discountAmount, debt };
  }, [selectedItems, prepayment]);

  const handleUpdate = () => {
    if (!clientName) return toast.error(t.clientRequired);

    const updatedItems = selectedItems.map(item => {
      const pos = allPositions.find(p => Number(p.id) === Number(item.positionId));
      const cat = categories.find(c => Number(c.id) === Number(item.categoryId));
      return {
        positionId: item.positionId ? Number(item.positionId) : null,
        position_name: pos?.name || item.position_name || 'Архивный товар',
        category_name: cat?.name || item.category_name || 'Архивная категория',
        quantity: Number(item.quantity),
        price: item.price,
        discount: item.discount,
        total_price: item.total_price
      };
    });

    const update: Partial<Order> = {
      order_date: orderDate,
      client_name: clientName,
      client_phone: phone,
      prepayment: prepayment, // Гарантированное сохранение предоплаты
      delivery_address: address,
      shipping_date: shippingDate,
      note: `Status: ${orderStatus}`,
      is_completed: orderStatus === t.statuses.client,
    };

    db.updateOrder(orderId, update, updatedItems as any);
    toast.success("Заказ обновлен");
    closeTab(activeTabId);
    window.dispatchEvent(new Event('storage'));
  };

  const startConfirmation = (type: 'full_payment' | 'complete_order') => {
    setConfirmType(type);
    setConfirmStep(1);
  };

  const executeAction = () => {
    if (confirmType === 'full_payment') {
      setPrepayment(totals.sumWithDiscount.toFixed(2));
    } else if (confirmType === 'complete_order') {
      setOrderStatus(t.statuses.client);
      setPrepayment(totals.sumWithDiscount.toFixed(2));
    }
    setConfirmStep(0);
    setConfirmType('none');
    toast.success("Операция подтверждена. Не забудьте сохранить изменения.");
  };

  if (!initialOrder) return null;

  return (
    <div className="p-0 h-full flex flex-col bg-white overflow-hidden relative">
      {confirmStep > 0 && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setConfirmStep(0)} />
          
          {confirmStep === 1 && (
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-blue-100">
               <div className="p-6 bg-blue-50 flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Info size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-blue-900 uppercase tracking-tighter leading-none">Подтвердите расчет</h3>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Шаг 1 из 2</p>
                  </div>
               </div>
               <div className="p-8 space-y-6">
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Сумма заказа:</span>
                        <span className="font-mono font-black text-blue-900">{totals.sumWithDiscount.toFixed(2)} ₽</span>
                     </div>
                     <div className="flex justify-between items-center text-emerald-600">
                        <span className="text-[10px] font-black uppercase">Будет внесено:</span>
                        <span className="font-mono font-black text-lg">{(totals.sumWithDiscount - parseFloat(prepayment)).toFixed(2)} ₽</span>
                     </div>
                  </div>
                  <p className="text-xs text-gray-500 font-medium text-center">Система автоматически рассчитает остаток и закроет дебиторскую задолженность по этой накладной.</p>
               </div>
               <div className="p-6 bg-gray-50 border-t flex gap-3">
                  <button onClick={() => setConfirmStep(0)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-100 transition-all">Отмена</button>
                  <button onClick={() => setConfirmStep(2)} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                    Далее <ChevronRight size={16} />
                  </button>
               </div>
            </div>
          )}

          {confirmStep === 2 && (
            <div className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-8 border-red-600">
              <div className="p-10 bg-red-600 text-white flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                   <Skull size={48} className="text-white" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter italic leading-none">КРИТИЧЕСКИ!</h3>
                <p className="text-[11px] font-bold uppercase opacity-80 leading-relaxed">
                   {confirmType === 'complete_order' ? 'ЗАКАЗ БУДЕТ ЗАВЕРШЕН И ПЕРЕНЕСЕН В АРХИВ.' : 'СУММА ОПЛАТЫ БУДЕТ ПРИРАВНЕНА К ПОЛНОЙ СТОИМОСТИ.'}
                </p>
              </div>
              <div className="p-8 bg-gray-50 border-t flex gap-3">
                <button onClick={() => setConfirmStep(1)} className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black hover:bg-gray-100 transition-all uppercase text-[10px] tracking-widest">Назад</button>
                <button 
                  onClick={executeAction}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-red-400 hover:bg-red-700 transition-all uppercase text-[10px] tracking-widest animate-blink"
                >
                  ДА, ВЫПОЛНИТЬ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-6 py-4 border-b flex justify-between items-center bg-white z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <Package size={20} />
          </div>
          <h2 className="text-xl font-black text-blue-900 flex items-center gap-2 tracking-tighter uppercase italic">
            {initialOrder.invoice_number}
          </h2>
          <div className="h-6 w-px bg-gray-100 mx-2" />
          <div className="flex gap-2">
             <button 
                onClick={() => startConfirmation('full_payment')} 
                className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100 uppercase tracking-widest"
             >
               <CreditCard size={14} /> Полная оплата
             </button>
             <button 
                onClick={() => startConfirmation('complete_order')} 
                className="bg-[#10b981] text-white px-4 py-1.5 rounded-xl text-[10px] font-black hover:bg-green-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100 uppercase tracking-widest"
             >
               <CheckCircle2 size={14} /> Завершить
             </button>
          </div>
        </div>
        <button onClick={() => closeTab(activeTabId)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">

  {/* ✅ ВСЕ ПОЛЯ В ОДНУ СТРОКУ (6) */}
  <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
    <div className="flex items-center gap-6 mb-2 px-1">
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-blue-600" />
        <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
          Системные метаданные
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Phone size={16} className="text-emerald-600" />
        <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">
          Клиентская база
        </span>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {/* 1) Дата заказа */}
      <div>
        <label className="block text-[9px] font-black text-gray-400 mb-1 uppercase tracking-widest ml-1">
          {t.orderDate}
        </label>
        <input
          type="date"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold bg-white"
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
        />
      </div>

      {/* 2) Статус заказа */}
      <div>
        <label className="block text-[9px] font-black text-gray-400 mb-1 uppercase tracking-widest ml-1">
          {t.orderStatus}
        </label>
        <select
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black bg-blue-50 text-blue-900 cursor-pointer"
          value={orderStatus}
          onChange={(e) => setOrderStatus(e.target.value)}
        >
          {Object.values(t.statuses).map((s) => (
            <option key={s as string} value={s as string}>
              {s as string}
            </option>
          ))}
        </select>
      </div>

      {/* 3) Предоплата (Внесено) */}
      <div>
        <label className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 ml-1">
          Предоплата (Внесено)
        </label>
        <div className="relative">
          <input
            type="number"
            className="w-full pl-10 p-3 border border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-black text-emerald-700 bg-emerald-50/30 shadow-inner"
            value={prepayment}
            onChange={(e) => setPrepayment(e.target.value)}
          />
          <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
        </div>
      </div>

      {/* 4) ФИО */}
      <div>
        <label className="block text-[9px] font-black text-gray-400 mb-1 uppercase tracking-widest ml-1">
          {t.clientName}
        </label>
        <input
          type="text"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold bg-white"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
      </div>

      {/* 5) Телефон */}
      <div>
        <label className="block text-[9px] font-black text-gray-400 mb-1 uppercase tracking-widest ml-1">
          {t.phone}
        </label>
        <input
          type="text"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold bg-white"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {/* 6) Адрес */}
      <div className="lg:col-span-1 sm:col-span-2">
        <label className="block text-[9px] font-black text-gray-400 mb-1 uppercase tracking-widest ml-1">
          {t.address}
        </label>
        <input
          type="text"
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
    </div>
  </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest flex items-center gap-3">
              <Package size={20} className="text-orange-500" /> Состав заказа
            </h3>
            <button onClick={addItem} className="bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase px-6">
              <Plus size={16} /> Добавить позицию
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-[2.5rem] p-6 border border-gray-100 space-y-3">
             {selectedItems.length > 0 ? (
               <>
                 <div className="grid grid-cols-[160px_1fr_80px_130px_80px_120px_44px] gap-4 px-4 mb-2">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Категория</div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Товар</div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Кол-во</div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Цена (₽)</div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Скидка%</div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Итого</div>
                    <div></div>
                 </div>
                 {selectedItems.map((item, idx) => {
                    const catalogPos = allPositions.find(p => p.id === Number(item.positionId));
                    const isPriceOverridden = catalogPos && parseFloat(item.price) !== parseFloat(catalogPos.price);

                    return (
                      <div key={idx} className="grid grid-cols-[160px_1fr_80px_130px_80px_120px_44px] gap-4 items-center p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all group">
                         <select 
                           className="p-2.5 bg-gray-50 border-none rounded-xl text-[11px] font-bold outline-none cursor-pointer" 
                           value={item.categoryId} 
                           onChange={(e) => updateItem(idx, 'categoryId', e.target.value)}
                         >
                           {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                         
                         <SearchableProductSelect 
                           categoryId={item.categoryId} 
                           value={item.positionId} 
                           fallbackName={item.position_name}
                           onChange={(val) => updateItem(idx, 'positionId', val)} 
                           allPositions={allPositions}
                         />

                         <input type="number" className="p-2.5 bg-gray-50 border-none rounded-xl text-xs font-black text-center outline-none" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                         
                         <div className="relative">
                           <input 
                             type="text" 
                             className={`w-full p-2.5 rounded-xl text-right font-mono font-black text-xs outline-none transition-all ${isPriceOverridden ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-gray-50 text-blue-900 focus:bg-blue-50 focus:ring-2 focus:ring-blue-300'}`} 
                             value={item.price} 
                             onChange={(e) => updateItem(idx, 'price', e.target.value)} 
                           />
                           {isPriceOverridden && (
                             <div className="absolute -top-2 -right-1 group/hint">
                               <AlertCircle size={10} className="text-amber-500 fill-white" />
                               <div className="hidden group-hover/hint:block absolute z-50 bottom-full right-0 mb-2 w-32 p-2 bg-gray-900 text-[8px] text-white rounded shadow-xl font-bold uppercase tracking-widest">
                                 Базовая цена: {catalogPos.price} ₽
                               </div>
                             </div>
                           )}
                         </div>

                         <input type="number" className="p-2.5 bg-gray-50 border-none rounded-xl text-center text-xs font-bold outline-none text-red-500" value={item.discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} />
                         <div className="text-right font-mono font-black text-blue-950 text-sm">
                           {item.total_price} ₽
                         </div>
                         <button onClick={() => removeItem(idx)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                      </div>
                    );
                 })}
               </>
             ) : (
               <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                 <Package size={48} className="text-gray-200" />
                 <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.3em]">Список товаров пуст</p>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 border-t flex justify-between items-center bg-gray-50 shrink-0">
        <div className="flex gap-12">
           <div className="flex flex-col">
             <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">СУММА ЗАКАЗА:</span>
             <span className="font-mono font-black text-2xl text-blue-900 leading-none">{totals.sumWithDiscount.toFixed(2)} ₽</span>
           </div>
           
           <div className="h-10 w-px bg-gray-200" />
           
           <div className="flex items-center gap-8">
              <div>
                <label className="block text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 ml-1">Предоплата (Внесено)</label>
                <div className="relative">
                   <input 
                     type="number" 
                     className="w-36 pl-9 p-2 bg-emerald-50 border-none rounded-xl font-mono font-black text-sm text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" 
                     value={prepayment} 
                     onChange={(e) => setPrepayment(e.target.value)} 
                   />
                   <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                </div>
              </div>
              
              {totals.debt > 0.01 && (
                <div className="animate-in fade-in slide-in-from-left-2">
                   <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Остаток долга:</p>
                   <p className="text-2xl font-black font-mono text-red-600 leading-none animate-pulse">{totals.debt.toFixed(2)} ₽</p>
                </div>
              )}
           </div>
        </div>

        <div className="flex gap-3">
          <button 
             onClick={handleUpdate} 
             className="bg-[#10b981] text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center gap-3"
          >
            <Save size={20} /> Зафиксировать изменения
          </button>
        </div>
      </div>
    </div>
  );
};
