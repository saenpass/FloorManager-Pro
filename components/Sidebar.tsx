
import React, { useState } from 'react';
import { LayoutDashboard, ShoppingCart, PlusCircle, Package, Layers, Users, PieChart, Calculator, Settings, LogOut, Languages, Download, X, Check } from 'lucide-react';
import { useStore } from '../store';
import { db } from '../db';
import { TabType } from '../types';
import { translations } from '../translations';

const SidebarItem = ({ icon: Icon, label, type, title }: { icon: any, label: string, type: TabType, title?: string }) => {
  const openTab = useStore(state => state.openTab);
  const { currentUser } = useStore();
  
  // Permission check
  const perm = currentUser?.permissions[type as keyof typeof currentUser.permissions];
  if (perm === 'none' && type !== 'dashboard') return null;

  return (
    <button 
      onClick={() => openTab(type, title || label)}
      className="flex items-center gap-3 w-full px-4 py-3 text-gray-300 hover:bg-blue-800 hover:text-white transition-colors"
    >
      <Icon size={20} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};

export const Sidebar = () => {
  const { language, setLanguage, setCurrentUser, currentUser } = useStore();
  const t = translations[language];
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const downloadBackupAndLogout = () => {
    const data = db.getRawData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `FM_EXIT_BACKUP_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setCurrentUser(null);
  };

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col h-full shadow-xl">
      <div className="p-6 border-b border-blue-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Layers className="text-orange-500" />
          <span>FloorManager</span>
        </h1>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-blue-300 uppercase tracking-wider">Inventory Pro v1.5</p>
          <button 
            onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
            className="flex items-center gap-1 text-[10px] font-bold bg-blue-800 px-2 py-0.5 rounded hover:bg-blue-700 transition-colors"
          >
            <Languages size={10} />
            {language.toUpperCase()}
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-blue-950 rounded-lg">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-bold uppercase text-blue-300 truncate">{currentUser?.username}</span>
        </div>
      </div>

      <nav className="flex-1 mt-4 overflow-y-auto">
        <SidebarItem icon={LayoutDashboard} label={t.desktop} type="dashboard" />
        <SidebarItem icon={ShoppingCart} label={t.orders} type="orders" />
        <SidebarItem icon={PlusCircle} label={t.createOrder} type="order-create" />
        <SidebarItem icon={Package} label={t.products} type="positions" />
        <SidebarItem icon={Layers} label={t.categories} type="categories" />
        <SidebarItem icon={Users} label={t.debtors} type="debtors" />
        <SidebarItem icon={PieChart} label={t.analytics} type="analytics" />
        <SidebarItem icon={Calculator} label={t.calculator} type="calculator" />
      </nav>

      <div className="border-t border-blue-800 p-2">
        <SidebarItem icon={Settings} label={t.settings} type="settings" />
        <button 
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-300 hover:bg-red-900 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          <span className="text-sm font-medium">{t.logout}</span>
        </button>
      </div>

      {/* Logout / Exit Backup Prompt */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-md" onClick={() => setShowLogoutModal(false)} />
           <div className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center space-y-6">
                 <div className="flex justify-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                       <Download size={28} />
                    </div>
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-blue-950 uppercase tracking-tighter">Завершение работы</h3>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Желаете сохранить резервную копию перед выходом? Это гарантирует сохранность данных.</p>
                 </div>

                 <div className="space-y-3">
                    <button 
                      onClick={downloadBackupAndLogout}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20"
                    >
                      <Download size={18} /> Скачать бэкап и выйти
                    </button>
                    <button 
                      onClick={() => setCurrentUser(null)}
                      className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all uppercase text-[10px] tracking-widest"
                    >
                      Просто выйти
                    </button>
                 </div>
                 
                 <button onClick={() => setShowLogoutModal(false)} className="text-[10px] font-black uppercase text-gray-300 tracking-widest hover:text-blue-600">Вернуться в систему</button>
              </div>
           </div>
        </div>
      )}
    </aside>
  );
};
