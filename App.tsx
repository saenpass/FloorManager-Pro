
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { Dashboard } from './pages/Dashboard';
import { OrderList } from './pages/OrderList';
import { OrderCreate } from './pages/OrderCreate';
import { OrderEdit } from './pages/OrderEdit';
import { Categories } from './pages/Categories';
import { Positions } from './pages/Positions';
import { Debtors } from './pages/Debtors';
import { Settings } from './pages/Settings';
import { Analytics } from './pages/Analytics';
import { Calculator } from './pages/Calculator';
import { useStore } from './store';
import { db } from './db';
import { ShieldCheck, Key, Info, Lock, User as UserIcon, LogIn } from 'lucide-react';
import { translations } from './translations';

const LicenseOverlay = () => {
  const [key, setKey] = useState('');
  const { language, setLicenseKey } = useStore();
  const t = translations[language];

  return (
    <div className="fixed inset-0 bg-blue-900/90 z-[999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t.activationRequired}</h2>
          <p className="text-gray-500 mt-2 mb-6">{t.activationText}</p>
          
          <div className="w-full relative mb-4">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
              placeholder="XXXXX-XXXXX-XXXXX" 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && key.length > 5) setLicenseKey(key);
              }}
            />
          </div>

          <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg mb-6 text-left">
            <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              <strong>{language === 'ru' ? 'Примечание:' : 'Note:'}</strong> {t.demoNote}
            </p>
          </div>

          <button 
            onClick={() => { if (key.length > 5) setLicenseKey(key); }}
            disabled={key.length <= 5}
            className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${key.length > 5 ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            {t.activateBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

const LoginScreen = () => {
  const { setCurrentUser } = useStore();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const users = db.getUsers();

  const handleLogin = () => {
    if (!selectedUser) return;
    if (!selectedUser.password || selectedUser.password === password) {
      setCurrentUser(selectedUser);
    } else {
      alert("Неверный пароль");
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-950 flex items-center justify-center z-[1000] p-4 overflow-hidden">
       <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="grid grid-cols-12 h-full">
             {Array.from({length: 144}).map((_, i) => <div key={i} className="border border-white/10" />)}
          </div>
       </div>
       
       <div className="bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 relative">
          <div className="p-10 text-center space-y-6">
             <div className="flex justify-center">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl rotate-12 flex items-center justify-center text-white shadow-xl shadow-blue-500/40 animate-pulse">
                   <Lock size={36} className="-rotate-12" />
                </div>
             </div>
             <div>
                <h1 className="text-3xl font-black text-blue-950 uppercase tracking-tighter">Вход в FM Pro</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Авторизация пользователя</p>
             </div>

             <div className="space-y-4 pt-4 text-left">
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Выберите аккаунт</label>
                   <select 
                     className="w-full p-4 border rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-950 cursor-pointer"
                     onChange={(e) => {
                       setSelectedUser(users.find(u => u.id === Number(e.target.value)));
                       setPassword('');
                     }}
                   >
                      <option value="">Выберите пользователя...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                   </select>
                </div>

                {selectedUser?.password && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-2">Пароль доступа</label>
                    <input 
                      type="password" 
                      className="w-full p-4 border rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </div>
                )}

                <button 
                  onClick={handleLogin}
                  disabled={!selectedUser}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  <LogIn size={20} /> Войти в систему
                </button>
             </div>
          </div>
          <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
             <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">FloorManager Pro System • 2025</p>
          </div>
       </div>
    </div>
  );
};

const App: React.FC = () => {
  const { tabs, activeTabId, licenseKey, language, currentUser } = useStore();
  const t = translations[language];

  // Prevent closing without backup warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Вы уверены, что хотите выйти? Рекомендуется сохранить бэкап в Настройках.";
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const renderContent = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return <Dashboard />;

    switch (activeTab.type) {
      case 'dashboard': return <Dashboard />;
      case 'orders': return <OrderList />;
      case 'order-create': return <OrderCreate />;
      case 'order-edit': return <OrderEdit orderId={activeTab.params?.orderId} />;
      case 'categories': return <Categories />;
      case 'positions': return <Positions />;
      case 'debtors': return <Debtors />;
      case 'settings': return <Settings />;
      case 'analytics': return <Analytics />;
      case 'calculator': return <Calculator />;
      default: return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <p className="text-lg font-medium">{language === 'ru' ? 'Модуль в разработке' : 'Module in development'}</p>
        </div>
      );
    }
  };

  if (!currentUser) return <LoginScreen />;

  return (
    <div className="flex h-screen w-screen overflow-hidden text-gray-900 bg-gray-50">
      {!licenseKey && <LicenseOverlay />}
      <Toaster position="top-right" />
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <TabBar />
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
