
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, DollarSign, Users, ShoppingBag, PieChart as PieChartIcon, 
  BarChart3, Activity, ArrowUpRight, ArrowDownRight, Award, Wallet, ShieldAlert
} from 'lucide-react';
import { db } from '../db';
import { format, subDays, startOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useStore } from '../store';
import { translations } from '../translations';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const StatCard = ({ title, value, trend, icon: Icon, color, isCurrency = false }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-current/10`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">{title}</p>
      <h3 className={`text-2xl font-black text-gray-900 mt-1 ${isCurrency ? 'font-mono' : ''}`}>
        {value}
        {isCurrency && <span className="text-sm ml-1 text-gray-400">₽</span>}
      </h3>
    </div>
  </div>
);

export const Analytics = () => {
  const { language } = useStore();
  const t = translations[language];
  const locale = language === 'ru' ? ru : enUS;

  const orders = useMemo(() => db.getOrders().filter(o => !o.is_deleted), []);
  const today = new Date();

  // --- Financial Stats ---
  const totals = useMemo(() => {
    let totalSales = 0;
    let actualCash = 0;
    let totalDebt = 0;

    orders.forEach(o => {
      const orderSum = o.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0;
      totalSales += orderSum;
      actualCash += parseFloat(o.prepayment || '0');
      
      // Exclude preorders from the business debt totals
      if (o.cargo_status_id !== 1) {
        totalDebt += (orderSum - parseFloat(o.prepayment || '0'));
      }
    });

    const avgCheck = orders.length > 0 ? totalSales / orders.length : 0;

    return { totalSales, actualCash, totalDebt, avgCheck };
  }, [orders]);

  // --- Sales Dynamics (Last 14 days) ---
  const salesHistory = useMemo(() => {
    const last14Days = eachDayOfInterval({
      start: subDays(today, 13),
      end: today,
    });

    return last14Days.map(day => {
      const dayOrders = orders.filter(o => isSameDay(new Date(o.order_date), day));
      const volume = dayOrders.reduce((acc, o) => acc + (o.items?.reduce((iAcc, i) => iAcc + parseFloat(i.total_price), 0) || 0), 0);
      const cash = dayOrders.reduce((acc, o) => acc + parseFloat(o.prepayment || '0'), 0);
      
      // Exclude preorders from debt calculation for the history chart
      const debt = dayOrders.reduce((acc, o) => {
        if (o.cargo_status_id === 1) return acc;
        const total = o.items?.reduce((iAcc, i) => iAcc + parseFloat(i.total_price), 0) || 0;
        return acc + (total - parseFloat(o.prepayment || '0'));
      }, 0);

      return {
        date: format(day, 'dd.MM'),
        volume,
        cash,
        debt: Math.max(0, debt)
      };
    });
  }, [orders]);

  // --- Category Breakdown ---
  const categorySales = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      o.items?.forEach(item => {
        map[item.category_name] = (map[item.category_name] || 0) + parseFloat(item.total_price);
      });
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  // --- Top Products ---
  const topProducts = useMemo(() => {
    const map: Record<string, { qty: number, revenue: number }> = {};
    orders.forEach(o => {
      o.items?.forEach(item => {
        const key = item.position_name;
        if (!map[key]) map[key] = { qty: 0, revenue: 0 };
        map[key].qty += item.quantity;
        map[key].revenue += parseFloat(item.total_price);
      });
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  // --- Top Clients ---
  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      const orderTotal = o.items?.reduce((acc, i) => acc + parseFloat(i.total_price), 0) || 0;
      map[o.client_name] = (map[o.client_name] || 0) + orderTotal;
    });
    return Object.entries(map)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50 no-scrollbar space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-blue-950 uppercase tracking-tighter">Аналитический центр</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Полный финансовый аудит системы</p>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Данные актуальны</span>
           </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t.analytics_total_sales} 
          value={totals.totalSales.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
          icon={TrendingUp} 
          color="bg-blue-600" 
          isCurrency 
        />
        <StatCard 
          title={t.analytics_cash_flow} 
          value={totals.actualCash.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
          icon={Wallet} 
          color="bg-emerald-500" 
          isCurrency 
        />
        <StatCard 
          title={t.analytics_debt_total} 
          value={totals.totalDebt.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
          icon={ShieldAlert} 
          color="bg-red-500" 
          isCurrency 
        />
        <StatCard 
          title={t.analytics_avg_check} 
          value={totals.avgCheck.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
          icon={Award} 
          color="bg-orange-500" 
          isCurrency 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Dynamic Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest flex items-center gap-2">
                 <Activity className="text-blue-600" size={18} /> Динамика выручки
              </h3>
              <div className="flex gap-4 text-[10px] font-bold uppercase text-gray-400">
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Объем</div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Касса</div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Долг (без предзаказов)</div>
              </div>
           </div>
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesHistory}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} 
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`,
                      name === 'volume' ? 'Объем' : (name === 'cash' ? 'Касса' : 'Долг')
                    ]}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                  <Area type="monotone" dataKey="cash" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCash)" />
                  <Area type="monotone" dataKey="debt" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorDebt)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Category Share */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
           <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest mb-8">
              {t.analytics_category_sales}
           </h3>
           <div className="flex-1 min-h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={categorySales}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categorySales.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`]}
                    />
                 </PieChart>
              </ResponsiveContainer>
              {categorySales.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-300">Нет данных</div>}
           </div>
           <div className="mt-6 space-y-2">
              {categorySales.slice(0, 4).map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-[10px] font-bold text-gray-500 uppercase truncate max-w-[140px]">{entry.name}</span>
                   </div>
                   <span className="text-[10px] font-black text-blue-900">{Math.round((entry.value / totals.totalSales) * 100)}%</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Rankings Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
         {/* Top Products Table */}
         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest mb-6 flex items-center gap-2">
               <ShoppingBag className="text-blue-600" size={18} /> {t.analytics_top_products}
            </h3>
            <div className="space-y-4">
               {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100">
                     <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-xl text-xs font-black text-blue-600 shadow-sm">{i+1}</div>
                        <div>
                           <p className="text-xs font-bold text-gray-900 leading-tight">{p.name}</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase">{p.qty} шт.</p>
                        </div>
                     </div>
                     <p className="text-sm font-black text-blue-900 font-mono">{p.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</p>
                  </div>
               ))}
               {topProducts.length === 0 && <p className="text-center py-10 text-gray-400 text-xs font-bold">Данные о продажах отсутствуют</p>}
            </div>
         </div>

         {/* Top Clients Table */}
         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest mb-6 flex items-center gap-2">
               <Users className="text-blue-600" size={18} /> {t.analytics_client_activity}
            </h3>
            <div className="space-y-4">
               {topClients.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100">
                     <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-xl text-xs font-black text-emerald-600 shadow-sm">{i+1}</div>
                        <p className="text-xs font-bold text-gray-900">{c.name}</p>
                     </div>
                     <p className="text-sm font-black text-emerald-700 font-mono">{c.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</p>
                  </div>
               ))}
               {topClients.length === 0 && <p className="text-center py-10 text-gray-400 text-xs font-bold">Клиентская база пуста</p>}
            </div>
         </div>
      </div>
    </div>
  );
};
