
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, Plus, X, Check, Layers, Search, Phone, MapPin, Calendar, CreditCard, Info, Package, AlertCircle, Wallet } from 'lucide-react';
import { db } from '../db';
import { Order, OrderItem, Position } from '../types';
import { useStore } from '../store';
import { translations } from '../translations';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type ClientSuggestion = {
  key: string;              // уникальный ключ (обычно нормализованный телефон или имя+тел)
  client_name: string;
  client_phone: string;
  delivery_address: string;
  last_order_date?: string; // опционально
};

const normalizePhone = (raw: string) => (raw || '').replace(/\D/g, ''); // только цифры

const normalizeName = (raw: string) =>
  (raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const buildClientIndexFromOrders = (orders: any[]): {
  clients: ClientSuggestion[];
  byPhone: Map<string, ClientSuggestion>;
} => {
  // Берем самые свежие данные по клиенту, если он встречается много раз
  const byPhone = new Map<string, ClientSuggestion>();
  const byNamePhone = new Map<string, ClientSuggestion>();

  // Сортировка: свежие заказы сверху (если order_date ISO)
  const sorted = [...orders].sort((a, b) => {
    const ta = new Date(a.order_date || 0).getTime();
    const tb = new Date(b.order_date || 0).getTime();
    return tb - ta;
  });

  for (const o of sorted) {
    if (!o || o.is_deleted) continue;

    const name = (o.client_name || '').trim();
    const phone = (o.client_phone || '').trim();
    const addr = (o.delivery_address || '').trim();
    if (!name && !phone) continue;

    const nPhone = normalizePhone(phone);
    const keyPhone = nPhone ? nPhone : '';
    const keyNamePhone = `${normalizeName(name)}|${nPhone || normalizePhone(o.client_phone || '')}`;

    const suggestion: ClientSuggestion = {
      key: keyPhone || keyNamePhone || `${name}|${phone}`,
      client_name: name || '',
      client_phone: phone || '',
      delivery_address: addr || '',
      last_order_date: o.order_date,
    };

    // приоритет: если есть телефон — это главный ключ
    if (keyPhone && !byPhone.has(keyPhone)) byPhone.set(keyPhone, suggestion);

    // имя+тел тоже храним, чтобы искать по ФИО даже когда телефон пустой/разный
    if (!byNamePhone.has(keyNamePhone)) byNamePhone.set(keyNamePhone, suggestion);
  }

  // итоговый список — уникальные записи
  const merged = new Map<string, ClientSuggestion>();
  for (const [k, v] of byPhone) merged.set(`p:${k}`, v);
  for (const [k, v] of byNamePhone) {
    // чтобы не дублировать клиента, если он уже есть по телефону
    const nPhone = normalizePhone(v.client_phone);
    if (nPhone && byPhone.has(nPhone)) continue;
    merged.set(`n:${k}`, v);
  }

  return { clients: Array.from(merged.values()), byPhone };
};

const filterClients = (clients: ClientSuggestion[], q: string) => {
  const query = q.trim();
  if (!query) return [];
  const qPhone = normalizePhone(query);
  const qName = normalizeName(query);

  return clients
    .filter(c => {
      if (qPhone.length >= 3) {
        // поиск по телефону
        return normalizePhone(c.client_phone).includes(qPhone);
      }
      // поиск по имени
      return normalizeName(c.client_name).includes(qName);
    })
    .slice(0, 8);
};

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

  const selectedProduct = useMemo(() => allPositions.find(p => p.id === Number(value)), [value, allPositions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { 
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false); 
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between p-2.5 border rounded-xl bg-white text-sm cursor-pointer hover:border-blue-300 shadow-sm transition-all">
        <span className={`truncate ${!selectedProduct && !fallbackName ? 'text-gray-400 italic' : 'text-blue-900 font-bold'}`}>
          {selectedProduct ? `${selectedProduct.brand} ${selectedProduct.name}` : (fallbackName || 'Выберите товар из списка...')}
        </span>
        <Search size={14} className="text-gray-400 ml-2" />
      </div>
      {isOpen && (
        <div className="absolute z-[100] top-full mt-1 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 bg-gray-50 border-b">
            <input autoFocus type="text" className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold" placeholder="Поиск по бренду или названию..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {filtered.map(p => (
              <div key={p.id} onClick={() => { onChange(p.id.toString()); setIsOpen(false); setSearch(''); }} className={`px-4 py-2.5 text-xs cursor-pointer hover:bg-blue-50 border-b last:border-none flex flex-col ${Number(value) === p.id ? 'bg-blue-50' : ''}`}>
                <div className="flex justify-between items-start">
                   <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">{p.brand}</span>
                      <span className="font-bold text-gray-900 truncate">{p.name}</span>
                   </div>
                   <span className="text-blue-600 font-mono font-black">{p.price} ₽</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="p-8 text-center text-[10px] font-black uppercase text-gray-300 tracking-widest">Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export const OrderCreate = () => {
  const { language, closeTab, activeTabId } = useStore();
  const t = translations[language];
  const categories = useMemo(() => db.getCategories(), []);
  const allPositions = useMemo(() => db.getPositions(), []);
  const statuses = useMemo(() => db.getCargoStatuses(), []);

  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [prepayment, setPrepayment] = useState('0');
  const [orderStatusId, setOrderStatusId] = useState(1); 
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

    // --- CLIENT AUTOCOMPLETE ---
  const allRawOrders = useMemo(() => db.getOrders(), []);
  const clientIndex = useMemo(() => buildClientIndexFromOrders(allRawOrders), [allRawOrders]);

  const [clientSuggestOpen, setClientSuggestOpen] = useState(false);
  const [clientSuggestMode, setClientSuggestMode] = useState<'name' | 'phone'>('name');
  const [clientSuggestQuery, setClientSuggestQuery] = useState('');
  const clientSuggestRef = useRef<HTMLDivElement>(null);

  const clientSuggestions = useMemo(() => {
    return filterClients(clientIndex.clients, clientSuggestQuery);
  }, [clientIndex.clients, clientSuggestQuery]);

  const applyClient = (c: ClientSuggestion) => {
    setClientName(c.client_name || '');
    setPhone(c.client_phone || '');
    setAddress(c.delivery_address || '');
    setClientSuggestOpen(false);
  };

  // закрытие по клику вне
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (clientSuggestRef.current && !clientSuggestRef.current.contains(e.target as Node)) {
        setClientSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // автоподстановка при точном совпадении телефона
  useEffect(() => {
    const n = normalizePhone(phone);
    // РФ: обычно 10-11 цифр (включая 7/8)
    if (n.length < 10) return;

    const found =
      clientIndex.byPhone.get(n) ||
      // на случай если вводят 8xxxxxxxxxx vs 7xxxxxxxxxx:
      (n.length === 11 && n.startsWith('8') ? clientIndex.byPhone.get('7' + n.slice(1)) : undefined) ||
      (n.length === 11 && n.startsWith('7') ? clientIndex.byPhone.get('8' + n.slice(1)) : undefined);

    if (found) {
      // Не “затираем” руками введенное имя/адрес без нужды:
      // но если они пустые — подставим сразу
      if (!clientName) setClientName(found.client_name || '');
      if (!address) setAddress(found.delivery_address || '');
    }
  }, [phone, clientIndex.byPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    const item = { ...newItems[idx], [field]: value };
    
    if (field === 'positionId') {
      const pos = allPositions.find(p => p.id === Number(value));
      if (pos) {
        item.price = pos.price;
        item.position_name = pos.name;
      }
    }
    
    const q = parseFloat(item.quantity || '0');
    const p = parseFloat(item.price || '0');
    const d = parseFloat(item.discount || '0');
    item.total_price = (q * p * (1 - d / 100)).toFixed(2);
    
    newItems[idx] = item;
    setSelectedItems(newItems);
  };

  const totals = useMemo(() => {
    const sum = selectedItems.reduce((acc, i) => acc + parseFloat(i.total_price || '0'), 0);
    const debt = sum - parseFloat(prepayment || '0');
    return { sum, debt };
  }, [selectedItems, prepayment]);

  const handleSave = () => {
    if (!clientName) return toast.error(t.clientRequired);
    if (selectedItems.length === 0) return toast.error(t.itemRequired);

    const items = selectedItems.map(i => {
      const pos = allPositions.find(p => p.id === Number(i.positionId));
      return {
        positionId: Number(i.positionId),
        position_name: pos?.name || i.position_name || 'Неизвестно',
        category_name: categories.find(c => c.id === Number(i.categoryId))?.name || i.category_name || '',
        quantity: Number(i.quantity),
        price: i.price,
        discount: i.discount,
        total_price: i.total_price
      };
    });

    db.createOrder({
      order_date: orderDate,
      client_name: clientName,
      client_phone: phone,
      prepayment: prepayment, // Гарантированное сохранение предоплаты
      delivery_address: address,
      shipping_date: null,
      cargo_status_id: orderStatusId,
      note: null,
      remind: false,
      is_completed: false,
      is_deleted: false,
    }, items as any);

    toast.success(t.orderSaved);
    closeTab(activeTabId);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="p-0 h-full flex flex-col bg-white overflow-hidden">
      <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 text-white">
            <Layers size={24}/>
          </div>
          <div>
            <h2 className="text-xl font-black text-blue-950 uppercase tracking-tighter italic">{t.newOrder}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Создание новой записи в журнале</p>
          </div>
        </div>
        <button onClick={() => closeTab(activeTabId)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all">
          <X size={24}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* ===== Системные данные (3 поля в одну строку на XL) ===== */}
          <div className="xl:col-span-6 space-y-4">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-blue-600" />
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Системные данные</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Дата заказа</label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white"
                    value={orderDate}
                    onChange={e => setOrderDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Статус заказа</label>
                  <select
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-blue-600 cursor-pointer"
                    value={orderStatusId}
                    onChange={e => setOrderStatusId(Number(e.target.value))}
                  >
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 ml-1">Предоплата (Внесено)</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full pl-10 p-3 border border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-black text-emerald-700 bg-emerald-50/30"
                      value={prepayment}
                      onChange={e => setPrepayment(e.target.value)}
                      placeholder="0.00"
                    />
                    <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Информация о клиенте (ФИО/Телефон/Адрес в одну строку на XL) ===== */}
          <div className="xl:col-span-6 space-y-4">
            <div
              ref={clientSuggestRef}
              className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4 relative"
            >
              <div className="flex items-center gap-2 mb-2">
                <Phone size={16} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">
                  Информация о клиенте
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* ===== ФИО ===== */}
                <div className="relative">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                    ФИО Клиента
                  </label>

                  <input
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-white"
                    value={clientName}
                    onFocus={() => {
                      setClientSuggestMode('name');
                      setClientSuggestQuery(clientName);
                      setClientSuggestOpen(true);
                    }}
                    onChange={(e) => {
                      const v = e.target.value;
                      setClientName(v);
                      setClientSuggestMode('name');
                      setClientSuggestQuery(v);
                      setClientSuggestOpen(true);
                    }}
                  />

                  {clientSuggestOpen && clientSuggestMode === 'name' && clientSuggestions.length > 0 && (
                    <div className="absolute z-[200] top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden">
                      {clientSuggestions.map((c) => (
                        <button
                          type="button"
                          key={c.key}
                          onClick={() => applyClient(c)}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b last:border-none"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-black text-gray-900 truncate">
                                {c.client_name || 'Без имени'}
                              </div>
                              <div className="text-[10px] font-bold text-gray-400 truncate">
                                {c.client_phone || '—'}
                              </div>
                              {c.delivery_address && (
                                <div className="text-[10px] font-medium text-gray-500 truncate">
                                  {c.delivery_address}
                                </div>
                              )}
                            </div>
                            <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest shrink-0">
                              выбрать
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ===== Телефон ===== */}
                <div className="relative">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                    Телефон
                  </label>

                  <input
                    type="text"
                    placeholder="+7 (___) ___-__-__"
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-white"
                    value={phone}
                    onFocus={() => {
                      setClientSuggestMode('phone');
                      setClientSuggestQuery(phone);
                      setClientSuggestOpen(true);
                    }}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPhone(v);
                      setClientSuggestMode('phone');
                      setClientSuggestQuery(v);
                      setClientSuggestOpen(true);
                    }}
                  />

                  {clientSuggestOpen && clientSuggestMode === 'phone' && clientSuggestions.length > 0 && (
                    <div className="absolute z-[200] top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden">
                      {clientSuggestions.map((c) => (
                        <button
                          type="button"
                          key={c.key}
                          onClick={() => applyClient(c)}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b last:border-none"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-black text-gray-900 truncate">
                                {c.client_phone || '—'}
                              </div>
                              <div className="text-[10px] font-bold text-gray-400 truncate">
                                {c.client_name || 'Без имени'}
                              </div>
                              {c.delivery_address && (
                                <div className="text-[10px] font-medium text-gray-500 truncate">
                                  {c.delivery_address}
                                </div>
                              )}
                            </div>
                            <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest shrink-0">
                              выбрать
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ===== Адрес ===== */}
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                    Адрес доставки
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Город, улица, дом, квартира..."
                      className="w-full pl-10 p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <div className="flex items-center gap-3">
              <Package size={20} className="text-orange-600" />
              <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest">Состав заказа</h3>
            </div>
            <button 
              onClick={() => setSelectedItems([...selectedItems, { categoryId: categories[0]?.id, positionId: '', quantity: 1, price: '0', discount: '0', total_price: '0' }])} 
              className="bg-orange-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-100"
            >
              <Plus size={16}/> Добавить позицию
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-[2.5rem] p-6 space-y-3">
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
                    <div key={idx} className="grid grid-cols-[160px_1fr_80px_130px_80px_120px_44px] gap-4 items-center p-3 bg-white border border-gray-100 rounded-2xl shadow-sm group hover:border-blue-200 transition-all">
                      <select className="p-2.5 bg-gray-50 border-none rounded-xl text-[11px] font-bold outline-none cursor-pointer" value={item.categoryId} onChange={e => updateItem(idx, 'categoryId', e.target.value)}>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      
                      <SearchableProductSelect categoryId={item.categoryId} value={item.positionId} allPositions={allPositions} onChange={val => updateItem(idx, 'positionId', val)} />
                      
                      <input type="number" className="p-2.5 bg-gray-50 border-none rounded-xl text-center text-xs font-black outline-none" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                      
                      <div className="relative">
                        <input 
                          type="text" 
                          className={`w-full p-2.5 rounded-xl text-right font-mono font-black text-xs outline-none transition-all ${isPriceOverridden ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-gray-50 text-blue-900 focus:bg-blue-50 focus:ring-2 focus:ring-blue-300'}`} 
                          value={item.price} 
                          onChange={e => updateItem(idx, 'price', e.target.value)} 
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

                      <input type="number" className="p-2.5 bg-gray-50 border-none rounded-xl text-center text-xs font-bold outline-none text-red-500" placeholder="0" value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} />
                      
                      <div className="text-right font-mono font-black text-blue-950 text-sm">{item.total_price} ₽</div>
                      
                      <button onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                <Package size={48} className="text-gray-200" />
                <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.3em]">Список товаров пуст. Нажмите кнопку выше для добавления.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 border-t bg-gray-50 flex justify-between items-center shrink-0">
        <div className="flex gap-10">
          <div>
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Сумма заказа</p>
             <p className="text-2xl font-black font-mono text-blue-900">{totals.sum.toFixed(2)} ₽</p>
          </div>
          <div className="flex items-center gap-6 border-l pl-10 border-gray-200">
             <div>
                <label className="block text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Предоплата (Внесено)</label>
                <div className="relative">
                   <input type="number" className="w-32 pl-9 p-2 bg-emerald-50 border-none rounded-xl font-mono font-black text-sm text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" value={prepayment} onChange={e => setPrepayment(e.target.value)} />
                   <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                </div>
             </div>
             {totals.debt > 0.01 && (
               <div className="animate-in fade-in slide-in-from-left-2">
                 <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Остаток долга</p>
                 <p className="text-2xl font-black font-mono text-red-600 animate-pulse">{totals.debt.toFixed(2)} ₽</p>
               </div>
             )}
          </div>
        </div>

        <button 
          onClick={handleSave} 
          className="bg-[#10b981] text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center gap-3"
        >
          <Check size={20}/> Сохранить и создать заказ
        </button>
      </div>
    </div>
  );
};
