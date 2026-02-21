
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, AlertCircle, ShoppingBag, Wallet, CalendarDays, Filter, EyeOff, Eye, ChevronRight, X, Phone, MapPin, ArrowRight } from 'lucide-react';
import { db } from '../db';
import { format, startOfMonth, endOfMonth, isSameDay, subDays, eachDayOfInterval, subMonths, isWithinInterval, startOfDay } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useStore } from '../store';
import { translations } from '../translations';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6', '#f43f5e', '#94a3b8'];

const StatCard = ({ title, value, secondaryValue, subtitle, icon: Icon, color, onClick, isCurrency = false }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:border-blue-100 group ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
  >
    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className={`text-3xl font-black text-blue-950 ${isCurrency ? 'font-mono' : ''}`}>
            {value}
            {isCurrency && <span className="text-sm ml-1 text-gray-300">₽</span>}
          </h3>
          {secondaryValue && (
            <span className="text-sm font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
              {secondaryValue}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{subtitle}</p>
      </div>
      <div className={`p-4 rounded-2xl ${color} shadow-2xl shadow-current/20 group-hover:scale-110 transition-transform`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    {onClick && (
      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Подробнее</span>
        <ArrowRight size={12} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
      </div>
    )}
  </div>
);

type TimeRange = '7d' | '30d' | 'curr_month' | 'prev_month';

export const Dashboard = () => {
  const { language, openTab } = useStore();
  const t = translations[language];
  const locale = language === 'ru' ? ru : enUS;

  // --- State ---
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [excludePreorders, setExcludePreorders] = useState(false);
  const [showUrgentModal, setShowUrgentModal] = useState(false);

  // --- Data Preparation ---
  const allOrders = useMemo(() => db.getOrders().filter(o => !o.is_deleted), []);
  const statuses = useMemo(() => db.getCargoStatuses(), []);
  const today = startOfDay(new Date());

  // Filtered orders based on global "Exclude Preorders" toggle
  const filteredOrders = useMemo(() => {
    return excludePreorders 
      ? allOrders.filter(o => o.cargo_status_id !== 1)
      : allOrders;
  }, [allOrders, excludePreorders]);

  // --- KPI Calculations ---
  const kpi = useMemo(() => {
    const todayOrders = filteredOrders.filter(o => isSameDay(new Date(o.order_date), today));
    
    // Debtors: always exclude preorders (status 1) regardless of global toggle
    const debtorsList = allOrders.filter(o => {
      if (o.cargo_status_id === 1) return false;
      const total = o.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0;
      return (total - parseFloat(o.prepayment)) > 0.01;
    });
    const totalDebtSum = debtorsList.reduce((acc, o) => {
      const total = o.items?.reduce((iAcc, i) => iAcc + parseFloat(i.total_price), 0) || 0;
      return acc + (total - parseFloat(o.prepayment));
    }, 0);

    const monthRevenue = filteredOrders
      .filter(o => isWithinInterval(new Date(o.order_date), { start: startOfMonth(today), end: endOfMonth(today) }))
      .reduce((acc, o) => acc + parseFloat(o.prepayment), 0);

    const urgentOrders = allOrders.filter(o => {
      if (!o.shipping_date || o.is_completed) return false;
      const shipDate = startOfDay(new Date(o.shipping_date));
      return isSameDay(shipDate, today) || shipDate < today;
    });

    return {
      todayCount: todayOrders.length,
      debtorsCount: debtorsList.length,
      debtorsSum: totalDebtSum,
      revenue: monthRevenue,
      urgentCount: urgentOrders.length,
      urgentList: urgentOrders
    };
  }, [filteredOrders, allOrders, today]);

  // --- Chart Data Logic ---
  const chartData = useMemo(() => {
    let interval: { start: Date; end: Date };

    switch (timeRange) {
      case '30d':
        interval = { start: subDays(today, 29), end: today };
        break;
      case 'curr_month':
        interval = { start: startOfMonth(today), end: today };
        break;
      case 'prev_month':
        const lastMonth = subMonths(today, 1);
        interval = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        break;
      case '7d':
      default:
        interval = { start: subDays(today, 6), end: today };
        break;
    }

    const days = eachDayOfInterval(interval);

    return days.map(day => {
      const dayOrders = allOrders.filter(o => isSameDay(new Date(o.order_date), day));
      // Sales respects excludePreorders toggle
      const activeDayOrders = excludePreorders ? dayOrders.filter(o => o.cargo_status_id !== 1) : dayOrders;

      const sales = activeDayOrders.reduce((acc, o) => {
        return acc + (o.items?.reduce((iAcc, i) => iAcc + parseFloat(i.total_price), 0) || 0);
      }, 0);

      // Debt calculation ALWAYS excludes preorders (status 1)
      const debt = dayOrders.filter(o => o.cargo_status_id !== 1).reduce((acc, o) => {
        const total = o.items?.reduce((iAcc, i) => iAcc + parseFloat(i.total_price), 0) || 0;
        return acc + (total - parseFloat(o.prepayment));
      }, 0);

      return {
        date: day,
        label: format(day, days.length > 14 ? 'dd.MM' : 'eee', { locale }),
        sales,
        debt: Math.max(0, debt)
      };
    });
  }, [allOrders, timeRange, today, locale, excludePreorders]);

  // --- Status Distribution ---
  const statusStats = useMemo(() => {
    const map: Record<number, number> = {};
    filteredOrders.forEach(o => {
      map[o.cargo_status_id] = (map[o.cargo_status_id] || 0) + 1;
    });

    return Object.entries(map).map(([id, count]) => {
      const status = statuses.find(s => s.id === Number(id));
      return {
        id: Number(id),
        name: status?.name || '...',
        value: count,
        color: status?.color || '#cbd5e1'
      };
    }).sort((a, b) => b.value - a.value);
  }, [filteredOrders, statuses]);

  return (
    <div className="p-8 h-full overflow-y-auto space-y-8 bg-gray-50 no-scrollbar">
      {/* --- HEADER & FILTERS --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-blue-950 tracking-tighter uppercase italic">{t.desktop}</h2>
          <p className="text-gray-400 mt-1 uppercase text-[10px] font-black tracking-[0.3em] flex items-center gap-2">
            <CalendarDays size={14} className="text-blue-500" />
            {format(today, 'dd MMMM yyyy', { locale })}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm">
           <button 
             onClick={() => setExcludePreorders(!excludePreorders)}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${excludePreorders ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
           >
             {excludePreorders ? <EyeOff size={14} /> : <Eye size={14} />}
             {excludePreorders ? "Предзаказы скрыты" : "Показывать предзаказы"}
           </button>

           <div className="h-6 w-px bg-gray-100 mx-2" />

           <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
             {(['7d', '30d', 'curr_month', 'prev_month'] as TimeRange[]).map(r => (
               <button
                 key={r}
                 onClick={() => setTimeRange(r)}
                 className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === r ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-blue-950'}`}
               >
                 {r === '7d' ? '7 Дн' : r === '30d' ? '30 Дн' : r === 'curr_month' ? 'Этот месяц' : 'Прошлый'}
               </button>
             ))}
           </div>
        </div>
      </div>

      {/* --- KPI GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t.todayOrders} 
          value={kpi.todayCount} 
          subtitle="Новых за текущие сутки" 
          icon={ShoppingBag} 
          color="bg-blue-600" 
        />
        <StatCard 
          title={t.debtors} 
          value={kpi.debtorsSum.toLocaleString('ru-RU')} 
          secondaryValue={`${kpi.debtorsCount} чел.`}
          subtitle="Общий долг по активным заказам" 
          icon={Users} 
          color="bg-red-500" 
          isCurrency={true}
          onClick={() => openTab('debtors', t.debtors)}
        />
        <StatCard 
          title={t.revenue} 
          value={kpi.revenue.toLocaleString('ru-RU')} 
          subtitle="Фактическая касса (этот месяц)" 
          icon={Wallet} 
          color="bg-emerald-500" 
          isCurrency={true}
        />
        <StatCard 
          title="Горит отгрузка" 
          value={kpi.urgentCount} 
          subtitle="Просрочено или сегодня" 
          icon={AlertCircle} 
          color={kpi.urgentCount > 0 ? "bg-orange-500 animate-pulse" : "bg-gray-400"} 
          onClick={kpi.urgentCount > 0 ? () => setShowUrgentModal(true) : null}
        />
      </div>

      {/* --- CHARTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Sales Performance Area */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <TrendingUp size={24} />
               </div>
               <div>
                  <h3 className="text-sm font-black text-blue-950 uppercase tracking-[0.2em]">{t.salesPerformance}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Оборот vs Дебиторка за период</p>
               </div>
            </div>
            
            <div className="hidden xl:flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Продажи</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Долг (без предзаказов)</span>
              </div>
            </div>
          </div>

          <div className="h-80 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                  tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '16px'}} 
                  labelFormatter={(l, p) => p?.[0]?.payload?.date ? format(p[0].payload.date, 'dd MMMM yyyy', { locale }) : l}
                  formatter={(val: number) => [`${val.toLocaleString('ru-RU')} ₽`]}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#2563eb" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="debt" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Circle */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-10">
             <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                <Filter size={24} />
             </div>
             <div>
                <h3 className="text-sm font-black text-blue-950 uppercase tracking-[0.2em]">{t.statusDistribution}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">По активным заказам</p>
             </div>
          </div>

          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={statusStats} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={70} 
                  outerRadius={100} 
                  paddingAngle={8} 
                  dataKey="value"
                  animationDuration={1500}
                >
                  {statusStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-black text-blue-950 leading-none">{filteredOrders.length}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Заказов</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 space-y-3 overflow-y-auto max-h-48 no-scrollbar pr-2">
             {statusStats.map((entry) => (
               <div key={entry.id} className="flex items-center justify-between group cursor-default">
                 <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase truncate max-w-[120px] group-hover:text-blue-950 transition-colors">{entry.name}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-950">{entry.value}</span>
                    <span className="text-[8px] font-bold text-gray-300">({Math.round(entry.value / filteredOrders.length * 100)}%)</span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* --- URGENT SHIPMENTS MODAL --- */}
      {showUrgentModal && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-blue-950/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowUrgentModal(false)} />
           <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-orange-100 flex flex-col h-[600px]">
              <div className="p-8 border-b flex justify-between items-center bg-orange-50/50">
                 <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-200 animate-pulse">
                       <AlertCircle size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-orange-950 uppercase tracking-tighter">Срочная отгрузка</h3>
                       <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Просрочено или на сегодня ({kpi.urgentCount})</p>
                    </div>
                 </div>
                 <button onClick={() => setShowUrgentModal(false)} className="text-gray-400 hover:text-orange-600 p-2 hover:bg-orange-100 rounded-full transition-all"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                 {kpi.urgentList.map(order => (
                    <div 
                      key={order.id} 
                      onClick={() => { openTab('order-edit', order.invoice_number || `${order.id}`, { orderId: order.id }); setShowUrgentModal(false); }}
                      className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 hover:border-orange-200 hover:bg-white transition-all group cursor-pointer flex justify-between items-center"
                    >
                       <div className="space-y-2">
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-black text-blue-900 font-mono">{order.invoice_number}</span>
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${isSameDay(new Date(order.shipping_date!), today) ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                {isSameDay(new Date(order.shipping_date!), today) ? 'Сегодня' : 'Просрочено'}
                             </span>
                          </div>
                          <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">{order.client_name}</h4>
                          <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase">
                             <span className="flex items-center gap-1"><Phone size={12} className="text-orange-400" /> {order.client_phone}</span>
                             <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin size={12} className="text-orange-400" /> {order.delivery_address}</span>
                          </div>
                       </div>
                       <div className="text-right flex flex-col items-end gap-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase">Дата отгрузки</p>
                          <p className="text-sm font-black text-orange-600 bg-white px-3 py-1.5 rounded-xl border border-orange-100 shadow-sm">
                             {format(new Date(order.shipping_date!), 'dd.MM.yyyy')}
                          </p>
                          <ChevronRight size={20} className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-2 transition-all mt-2" />
                       </div>
                    </div>
                 ))}
              </div>
              
              <div className="p-8 bg-gray-50 border-t text-center">
                 <button 
                   onClick={() => setShowUrgentModal(false)}
                   className="w-full py-5 bg-white border-2 border-orange-200 text-orange-600 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-orange-50 transition-all active:scale-95"
                 >
                    Закрыть окно
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
