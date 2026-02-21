
import React, { useState, useMemo } from 'react';
import { User, Shield, Database, Lock, UserPlus, Trash2, Edit2, FileDown, FileUp, Download, Check, X, ShieldAlert, AlertTriangle, Key, Bomb, Flame, FileText } from 'lucide-react';
import { db } from '../db';
import { User as UserType, UserPermissions } from '../types';
import { useStore } from '../store';
import { translations } from '../translations';
import toast from 'react-hot-toast';

const PERMISSION_KEYS: (keyof UserPermissions)[] = ['dashboard', 'orders', 'positions', 'categories', 'debtors', 'analytics', 'settings'];

export const Settings = () => {
  const { language, currentUser, setCurrentUser } = useStore();
  const t = translations[language];

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'users' | 'database'>('profile');
  const [users, setUsers] = useState<UserType[]>(db.getUsers());

  // Profile Form
  const [profileName, setProfileName] = useState(currentUser?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // User Manager
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserType> | null>(null);

  // DB Logic
  const [clearConfirmStep, setClearConfirmStep] = useState<0 | 1 | 2 | 3>(0);

  const refreshUsers = () => setUsers(db.getUsers());

  const handleUpdateProfile = () => {
    if (!profileName) return toast.error("Имя профиля обязательно");
    if (newPassword && newPassword !== confirmPassword) return toast.error("Пароли не совпадают");

    const update: Partial<UserType> = { username: profileName };
    if (newPassword) update.password = newPassword;

    db.updateUser(currentUser!.id, update);
    setCurrentUser({ ...currentUser!, ...update });
    toast.success("Профиль обновлен");
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleOpenUserModal = (user?: UserType) => {
    setEditingUser(user || {
      username: '',
      password: '',
      role: 'user',
      permissions: {
        dashboard: 'view',
        orders: 'view',
        positions: 'view',
        categories: 'view',
        debtors: 'view',
        analytics: 'view',
        settings: 'none'
      }
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!editingUser?.username) return toast.error("Логин обязателен");
    if (editingUser.id) {
      db.updateUser(editingUser.id, editingUser);
    } else {
      db.addUser(editingUser as Omit<UserType, 'id'>);
    }
    toast.success("Пользователь сохранен");
    setIsUserModalOpen(false);
    refreshUsers();
  };

  // --- DATABASE OPERATIONS ---

  const downloadBackup = (type: 'image' | 'sql' = 'image') => {
    const data = db.getRawData();
    
    if (type === 'image') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `FM_PRO_SYSTEM_IMAGE_${new Date().getTime()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      toast.success("Системный образ сохранен");
    } else {
      // SQL Dump Generation for SQLite compatibility
      let sql = `-- FloorManager Pro SQLite Dump\n-- Generated: ${new Date().toLocaleString()}\n\n`;
      
      // Example table dump logic (simple implementation)
      Object.entries(data).forEach(([tableName, rows]) => {
        if (Array.isArray(rows)) {
          sql += `\n-- Table: ${tableName}\n`;
          rows.forEach(row => {
            const keys = Object.keys(row).join(', ');
            const values = Object.values(row).map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
            sql += `INSERT INTO ${tableName} (${keys}) VALUES (${values});\n`;
          });
        }
      });

      const blob = new Blob([sql], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FM_PRO_SQLITE_DUMP_${new Date().getTime()}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("SQL дамп сформирован");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        // Basic validation
        if (!data.users || !data.categories) throw new Error("Invalid format");

        if (window.confirm("Это полностью заменит текущие данные и настройки. Продолжить?")) {
          db.importRawData(data);
          toast.success("Система восстановлена из образа");
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch (err) {
        toast.error("Ошибка: Файл не является корректным системным образом");
      }
    };
    reader.readAsText(file);
  };

  const performFullClear = (isNuclear: boolean) => {
    downloadBackup('image'); // Safety backup
    if (isNuclear) {
      db.nuclearWipe();
      toast.success("ПОЛНОЕ УНИЧТОЖЕНИЕ ДАННЫХ ВЫПОЛНЕНО");
    } else {
      db.clearAllData();
      toast.success("Данные очищены (Менеджеры сохранены)");
    }
    setClearConfirmStep(0);
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="p-0 h-full flex flex-col bg-white overflow-hidden">
      <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-2xl font-black text-blue-950 uppercase tracking-tighter flex items-center gap-2">
            <Shield className="text-blue-600" size={28} /> {t.settings}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Системная конфигурация Pro</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => setActiveSubTab('profile')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'profile' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Профиль
          </button>
          <button 
            onClick={() => setActiveSubTab('users')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Пользователи
          </button>
          <button 
            onClick={() => setActiveSubTab('database')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'database' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            База Данных
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
        {activeSubTab === 'profile' && (
          <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                      <User size={32} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-gray-900">Управление профилем</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Основной аккаунт системы</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Имя пользователя / Логин</label>
                    <input 
                      type="text" 
                      className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900 bg-white"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Lock size={10}/> Новый пароль</label>
                      <input 
                        type="password" 
                        className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Check size={10}/> Повторите</label>
                      <input 
                        type="password" 
                        className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleUpdateProfile}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                >
                  <Check size={18} /> Сохранить изменения
                </button>
             </div>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                   <UserPlus size={24} className="text-blue-600" />
                   <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Менеджеры и права</h3>
                </div>
                <button 
                  onClick={() => handleOpenUserModal()}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-90 flex items-center gap-2 text-xs uppercase tracking-widest"
                >
                  <UserPlus size={16} /> Добавить
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(u => (
                   <div key={u.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${u.role === 'admin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                               {u.role === 'admin' ? <Shield size={20} /> : <User size={20} />}
                            </div>
                            <div>
                               <h4 className="font-black text-gray-900 leading-none">{u.username}</h4>
                               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.role === 'admin' ? 'Администратор' : 'Менеджер'}</span>
                            </div>
                         </div>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenUserModal(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                            {u.id !== 1 && (
                              <button onClick={() => { if(window.confirm("Удалить?")) { db.deleteUser(u.id); refreshUsers(); }}} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                            )}
                         </div>
                      </div>

                      <div className="space-y-1.5 pt-4 border-t border-gray-50">
                        {PERMISSION_KEYS.map(p => (
                          <div key={p} className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                            <span className="text-gray-400">{p}:</span>
                            <span className={u.permissions[p] === 'none' ? 'text-red-400' : u.permissions[p] === 'edit' ? 'text-blue-600' : 'text-emerald-500'}>
                              {u.permissions[p]}
                            </span>
                          </div>
                        ))}
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeSubTab === 'database' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-100 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col justify-between">
                   <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Database className="text-emerald-600" size={24} />
                        <h3 className="font-black text-gray-900 uppercase">Системный образ</h3>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">Полный снимок всей системы (JSON) для горячего восстановления.</p>
                   </div>
                   <button 
                     onClick={() => downloadBackup('image')}
                     className="w-full py-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all uppercase text-[10px] tracking-widest shadow-sm"
                   >
                     <Download size={18} /> Скачать образ
                   </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col justify-between">
                   <div>
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="text-blue-600" size={24} />
                        <h3 className="font-black text-gray-900 uppercase">SQLite Дамп</h3>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">Экспорт данных в виде SQL-запросов для переноса в SQLite СУБД.</p>
                   </div>
                   <button 
                     onClick={() => downloadBackup('sql')}
                     className="w-full py-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-100 transition-all uppercase text-[10px] tracking-widest shadow-sm"
                   >
                     <FileDown size={18} /> Экспорт в .SQL
                   </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col justify-between">
                   <div>
                      <div className="flex items-center gap-3 mb-2">
                        <FileUp className="text-purple-600" size={24} />
                        <h3 className="font-black text-gray-900 uppercase">Импорт образа</h3>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">Восстановление всех данных и прав доступа из файла образа.</p>
                   </div>
                   <label className="w-full py-4 bg-purple-50 text-purple-700 border border-purple-100 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-purple-100 transition-all cursor-pointer uppercase text-[10px] tracking-widest shadow-sm">
                     <FileUp size={18} /> Загрузить JSON
                     <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                   </label>
                </div>
             </div>

             <div className="bg-red-50 border border-red-100 rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Bomb size={120} className="text-red-900" />
                </div>
                
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-red-600 rounded-2xl text-white shadow-xl shadow-red-200">
                      <ShieldAlert size={32} className="animate-pulse" />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-red-900 uppercase tracking-tight">Терминальная очистка</h3>
                      <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Зона безвозвратного удаления данных</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                   <p className="text-sm text-red-800 font-medium leading-relaxed">
                     Внимание! При выполнении данной операции вся информация будет стерта. Выберите режим: «Обычная очистка» (заказы и товары) или «Ядерный сброс» (полное уничтожение до заводских настроек).
                   </p>
                   <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => setClearConfirmStep(1)}
                        className="w-full py-4 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black shadow-lg hover:bg-red-50 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                      >
                        <Trash2 size={18} /> Обычная очистка
                      </button>
                      <button 
                        onClick={() => { setClearConfirmStep(1); /* Logic to mark as nuclear could go here if needed */ }}
                        className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-2xl shadow-red-200 hover:bg-red-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 border-b-4 border-red-800"
                      >
                        <Bomb size={18} /> Ядерный сброс (Nuclear)
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* User Edit Modal */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-blue-100 flex flex-col h-[600px]">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
               <h3 className="text-lg font-black text-blue-900 uppercase tracking-tighter">
                  {editingUser.id ? 'Настройка менеджера' : 'Регистрация нового менеджера'}
               </h3>
               <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition-all"><X size={20} /></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Логин</label>
                        <input 
                          type="text" 
                          className="w-full p-4 border rounded-2xl bg-gray-50 focus:bg-white outline-none font-bold" 
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Пароль (оставьте пустым для входа без)</label>
                        <input 
                          type="password" 
                          className="w-full p-4 border rounded-2xl bg-gray-50 focus:bg-white outline-none font-mono"
                          placeholder="••••••••"
                          value={editingUser.password || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                        />
                      </div>
                   </div>
                   <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                         <Shield className="text-blue-600" size={18} />
                         <span className="text-xs font-black text-blue-900 uppercase tracking-widest">Роль и тип</span>
                      </div>
                      <select 
                        className="w-full p-4 border border-blue-200 rounded-2xl outline-none font-bold text-blue-900 bg-white"
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                      >
                         <option value="user">Обычный менеджер</option>
                         <option value="admin">Администратор (Полный доступ)</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2">
                      <Key size={16} className="text-blue-600" /> Тонкая настройка разрешений
                   </h4>
                   <div className="grid grid-cols-2 gap-x-12 gap-y-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      {PERMISSION_KEYS.map(key => (
                         <div key={key} className="flex items-center justify-between group">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">{key}</span>
                            <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                               {['none', 'view', 'edit'].map(v => (
                                 <button 
                                   key={v}
                                   onClick={() => setEditingUser({
                                     ...editingUser,
                                     permissions: { ...editingUser.permissions!, [key]: v }
                                   })}
                                   className={`px-3 py-1 text-[9px] font-black uppercase rounded transition-all ${editingUser.permissions?.[key] === v ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                 >
                                    {v}
                                 </button>
                               ))}
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="p-6 bg-gray-50 border-t flex gap-3">
               <button onClick={() => setIsUserModalOpen(false)} className="flex-1 bg-white border border-gray-200 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all">Отмена</button>
               <button 
                 onClick={handleSaveUser}
                 className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
               >
                 <Check size={20} /> Зафиксировать права
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Clear Database Confirm Steps */}
      {clearConfirmStep > 0 && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setClearConfirmStep(0)} />
          <div className={`relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 ${clearConfirmStep === 3 ? 'border-red-600' : 'border-orange-500'}`}>
             <div className={`p-8 flex items-center gap-4 ${clearConfirmStep < 3 ? 'bg-orange-500 text-white' : 'bg-red-600 text-white animate-pulse'}`}>
               {clearConfirmStep < 3 ? <AlertTriangle size={40} /> : <Bomb size={40} />}
               <div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight">
                   {clearConfirmStep === 1 ? 'Сброс данных' : clearConfirmStep === 2 ? 'ПРЕДУПРЕЖДЕНИЕ' : 'ЯДЕРНОЕ УНИЧТОЖЕНИЕ'}
                 </h3>
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Уровень подтверждения: {clearConfirmStep}/3</p>
               </div>
             </div>

             <div className="p-10 space-y-6">
                <p className="text-gray-900 font-black text-2xl leading-tight">
                   {clearConfirmStep === 1 
                     ? 'Вы действительно хотите очистить систему от заказов и товаров?' 
                     : clearConfirmStep === 2 
                     ? 'Это действие НЕОБРАТИМО. Будет выполнено полное стирание всех таблиц!' 
                     : 'ВНИМАНИЕ! Вы собираетесь стереть ВСЁ, включая лицензионный ключ и администраторов!'}
                </p>
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200">
                   <p className="text-[10px] text-gray-500 mb-3 font-black uppercase tracking-widest">Протокол уничтожения:</p>
                   <ul className="text-xs font-bold text-gray-700 space-y-2">
                      <li className="flex items-center gap-2 text-emerald-600"><Check size={16} /> Создание аварийного бэкапа</li>
                      <li className={`flex items-center gap-2 ${clearConfirmStep > 1 ? 'text-red-600' : 'text-gray-400'}`}><Flame size={16} /> Аннигиляция всех заказов</li>
                      <li className={`flex items-center gap-2 ${clearConfirmStep > 1 ? 'text-red-600' : 'text-gray-400'}`}><Flame size={16} /> Аннигиляция всей номенклатуры</li>
                      <li className={`flex items-center gap-2 ${clearConfirmStep === 3 ? 'text-red-600 font-black' : 'text-gray-300'}`}><Bomb size={16} /> Удаление учетных записей и лицензии</li>
                   </ul>
                </div>
             </div>

             <div className="p-8 bg-gray-50 border-t flex gap-4">
                <button onClick={() => setClearConfirmStep(0)} className="flex-1 py-5 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black hover:bg-gray-100 uppercase text-[11px] tracking-widest shadow-sm">Отмена</button>
                <button 
                  onClick={() => {
                    if (clearConfirmStep < 3) setClearConfirmStep((prev: any) => prev + 1);
                    else performFullClear(true);
                  }}
                  className={`flex-1 text-white py-5 rounded-2xl font-black shadow-2xl transition-all active:scale-95 uppercase text-[11px] tracking-widest ${clearConfirmStep === 3 ? 'bg-red-600 hover:bg-red-700 animate-bounce' : 'bg-orange-600 hover:bg-orange-700'}`}
                >
                   {clearConfirmStep === 1 ? 'Продолжить' : clearConfirmStep === 2 ? 'Я осознаю риск' : 'УНИЧТОЖИТЬ ВСЁ'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
