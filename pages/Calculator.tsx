
import React, { useState, useMemo, useRef } from 'react';
import { 
  Calculator as CalcIcon, Plus, Trash2, Layers, Package, Hammer, 
  Settings2, Download, Check, X, Info, TrendingUp, Wallet, DollarSign,
  AlertTriangle, ShieldAlert, FileText, ChevronRight, Edit3, FileUp, FileDown, MoreHorizontal
} from 'lucide-react';
import { db } from '../db';
import { Position, Category, WorkCategory, WorkPosition } from '../types';
import { useStore } from '../store';
import { translations } from '../translations';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type DeleteRequest = {
  type: 'material' | 'labor' | 'catalog';
  id?: number;
  index?: number;
  title: string;
} | null;

export const Calculator = () => {
  const { language } = useStore();
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View State
  const [activeTab, setActiveTab] = useState<'calc' | 'catalog'>('calc');

  // Calculation State
  const [materialLines, setMaterialLines] = useState<any[]>([]);
  const [laborLines, setLaborLines] = useState<any[]>([]);
  const [projectName, setProjectName] = useState('');

  // Catalog State
  const [workPositions, setWorkPositions] = useState<WorkPosition[]>(db.getWorkPositions());
  const workCategories = db.getWorkCategories();

  // Deletion Confirmation State
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest>(null);

  // Modal State for Editing Labor
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Partial<WorkPosition> | null>(null);

  // Loading States
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Data Sources
  const categories = db.getCategories();
  const allPositions = db.getPositions();

  // --- Calculation Handlers ---
  const addMaterialLine = () => {
    setMaterialLines([...materialLines, { categoryId: categories[0]?.id || '', positionId: '', quantity: 0, price: '0', total: 0 }]);
  };

  const addLaborLine = () => {
    setLaborLines([...laborLines, { categoryId: workCategories[0]?.id || '', positionId: '', quantity: 0, price: '0', total: 0 }]);
  };

  const updateMaterialLine = (idx: number, field: string, value: any) => {
    const newLines = [...materialLines];
    const line = { ...newLines[idx], [field]: value };
    if (field === 'positionId') {
      const pos = allPositions.find(p => p.id === Number(value));
      if (pos) line.price = pos.price;
    }
    line.total = parseFloat(line.price || '0') * (parseFloat(line.quantity) || 0);
    newLines[idx] = line;
    setMaterialLines(newLines);
  };

  const updateLaborLine = (idx: number, field: string, value: any) => {
    const newLines = [...laborLines];
    const line = { ...newLines[idx], [field]: value };
    if (field === 'positionId') {
      const pos = workPositions.find(p => p.id === Number(value));
      if (pos) line.price = pos.price;
    }
    line.total = parseFloat(line.price || '0') * (parseFloat(line.quantity) || 0);
    newLines[idx] = line;
    setLaborLines(newLines);
  };

  const confirmDelete = (type: 'material' | 'labor' | 'catalog', idOrIdx: number, title?: string) => {
    let itemTitle = title || 'Позиция';
    if (!title) {
       if (type === 'material') {
          const line = materialLines[idOrIdx];
          const p = allPositions.find(pos => pos.id === Number(line.positionId));
          itemTitle = p?.name || 'Товар без названия';
       } else if (type === 'labor') {
          const line = laborLines[idOrIdx];
          const p = workPositions.find(pos => pos.id === Number(line.positionId));
          itemTitle = p?.name || 'Работа без названия';
       }
    }
    setDeleteRequest({ type, [type === 'catalog' ? 'id' : 'index']: idOrIdx, title: itemTitle });
  };

  const executeDelete = () => {
    if (!deleteRequest) return;
    if (deleteRequest.type === 'material') {
      setMaterialLines(materialLines.filter((_, i) => i !== deleteRequest.index));
      toast.success("Позиция удалена из расчета");
    } else if (deleteRequest.type === 'labor') {
      setLaborLines(laborLines.filter((_, i) => i !== deleteRequest.index));
      toast.success("Работа удалена из расчета");
    } else if (deleteRequest.type === 'catalog' && deleteRequest.id) {
      db.deleteWorkPosition(deleteRequest.id);
      setWorkPositions(db.getWorkPositions());
      toast.success("Услуга удалена из справочника");
    }
    setDeleteRequest(null);
  };

  const totals = useMemo(() => {
    const materials = materialLines.reduce((acc, l) => acc + (l.total || 0), 0);
    const labor = laborLines.reduce((acc, l) => acc + (l.total || 0), 0);
    return { materials, labor, grandTotal: materials + labor };
  }, [materialLines, laborLines]);

  // --- Catalog Editing Handlers ---
  const handleOpenEditModal = (work?: WorkPosition) => {
    setEditingWork(work || { name: '', categoryId: workCategories[0].id, price: '0', unit: 'м²' });
    setIsEditModalOpen(true);
  };

  const handleSaveWork = () => {
    if (!editingWork?.name) return toast.error("Введите название работы");
    if (!editingWork?.price || parseFloat(editingWork.price) < 0) return toast.error("Укажите корректную стоимость");

    if (editingWork.id) {
      db.updateWorkPosition(editingWork.id, editingWork);
      toast.success("Информация о работе обновлена");
    } else {
      db.addWorkPosition(editingWork as any);
      toast.success("Новая работа добавлена в справочник");
    }
    setWorkPositions(db.getWorkPositions());
    setIsEditModalOpen(false);
  };

  // --- IMPORT / EXPORT LOGIC FOR WORK CATALOG ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        let importedData: any[] = [];

        if (file.name.endsWith('.json')) {
          importedData = JSON.parse(data as string);
        } else {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          importedData = XLSX.utils.sheet_to_json(worksheet);
        }

        const worksToImport: Omit<WorkPosition, 'id'>[] = importedData.map(row => {
          const catName = row['Категория'] || row['category'] || '';
          const category = workCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          
          return {
            name: String(row['Название'] || row['name'] || ''),
            categoryId: category ? category.id : (workCategories[0]?.id || 1),
            price: String(row['Цена'] || row['price'] || '0'),
            unit: String(row['Ед. изм.'] || row['unit'] || 'м²'),
          };
        }).filter(w => w.name !== '');

        if (worksToImport.length > 0) {
          const count = db.bulkAddWorkPositions(worksToImport);
          toast.success(`${t.importSuccess} ${count}`);
          setWorkPositions(db.getWorkPositions());
        }
      } catch (err) {
        console.error(err);
        toast.error(t.importError);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const exportToXLSX = () => {
    setIsExporting(true);
    try {
      const dataToExport = workPositions.map(w => {
        const cat = workCategories.find(c => c.id === w.categoryId);
        return {
          'ID': w.id,
          'Категория': cat?.name || 'Без категории',
          'Название': w.name,
          'Цена': w.price,
          'Ед. изм.': w.unit
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "WorkPositions");
      XLSX.writeFile(workbook, `Work_Catalog_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success(language === 'ru' ? 'Excel файл скачан' : 'Excel file downloaded');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workPositions, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `work_positions_backup_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success(language === 'ru' ? 'JSON файл скачан' : 'JSON file downloaded');
  };

  return (
    <div className="p-0 h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* HEADER SECTION */}
      <div className="px-8 py-6 border-b flex justify-between items-center bg-white shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <CalcIcon className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-blue-950 uppercase tracking-tighter leading-none">Сметный калькулятор</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Детализированный расчет проекта</p>
          </div>
        </div>
        
        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('calc')}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'calc' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Новая смета
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'catalog' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Справочник услуг
          </button>
        </div>
      </div>

      {activeTab === 'calc' ? (
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar animate-in fade-in duration-300">
          {/* TOTAL CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
                 <Package size={80} className="text-blue-900" />
               </div>
               <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Общие материалы</p>
               <h4 className="text-2xl sm:text-3xl font-black text-blue-900 font-mono mt-2">{totals.materials.toLocaleString('ru-RU')} <span className="text-sm font-bold text-gray-300">₽</span></h4>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
                 <Hammer size={80} className="text-emerald-900" />
               </div>
               <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Стоимость работ</p>
               <h4 className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-2">{totals.labor.toLocaleString('ru-RU')} <span className="text-sm font-bold text-gray-300">₽</span></h4>
            </div>
            <div className="bg-blue-600 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl shadow-blue-200 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-20 hidden sm:block">
                 <TrendingUp size={80} className="text-white" />
               </div>
               <p className="text-[11px] font-black text-blue-100 uppercase tracking-widest">ИТОГО ПО СМЕТЕ</p>
               <h4 className="text-2xl sm:text-3xl font-black text-white font-mono mt-2">{totals.grandTotal.toLocaleString('ru-RU')} <span className="text-sm font-bold text-blue-300">₽</span></h4>
            </div>
          </div>

          {/* PROJECT INFO */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
                <FileText className="text-blue-600" size={20} />
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Сведения о объекте</h3>
             </div>
             <input 
               type="text" 
               className="w-full p-4 sm:p-5 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-950 transition-all text-base sm:text-lg placeholder:text-gray-300"
               placeholder="Введите название проекта или ФИО клиента..."
               value={projectName}
               onChange={(e) => setProjectName(e.target.value)}
             />
          </div>

          {/* MATERIALS CALCULATION */}
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest flex items-center gap-3">
                   <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                     <Package size={18} />
                   </div>
                   Расчет материалов
                </h3>
                <button 
                  onClick={addMaterialLine}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                >
                   <Plus size={16} /> Добавить позицию
                </button>
             </div>

             <div className="space-y-3 overflow-x-auto no-scrollbar">
                <div className="min-w-[800px] space-y-3 px-2">
                  {/* Table Headers for Materials */}
                  <div className="grid grid-cols-[140px_minmax(0,1fr)_70px_100px_120px_44px] gap-4 px-3.5 mb-1">
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter truncate">{t.category}</div>
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter truncate">{t.selectProduct}</div>
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter text-center truncate">{t.qty}</div>
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter text-right truncate">{t.price}</div>
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter text-right truncate">{t.total}</div>
                     <div></div>
                  </div>

                  {materialLines.map((line, idx) => {
                    const catPos = allPositions.filter(p => p.categoryId === Number(line.categoryId));
                    return (
                     <div key={idx} className="grid grid-cols-[140px_minmax(0,1fr)_70px_100px_120px_44px] gap-4 items-center p-3.5 bg-gray-50 rounded-2xl group border border-transparent hover:border-blue-100 transition-all">
                        <select 
                          className="p-2.5 bg-white border rounded-xl text-[11px] font-bold outline-none cursor-pointer w-full truncate shadow-sm"
                          value={line.categoryId}
                          onChange={(e) => updateMaterialLine(idx, 'categoryId', e.target.value)}
                        >
                          <option value="">Категория...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="min-w-0">
                          <select 
                            className="p-2.5 bg-white border rounded-xl text-[11px] font-bold outline-none truncate cursor-pointer w-full shadow-sm"
                            value={line.positionId}
                            onChange={(e) => updateMaterialLine(idx, 'positionId', e.target.value)}
                          >
                            <option value="">Выберите товар из базы...</option>
                            {catPos.map(p => <option key={p.id} value={p.id}>{p.brand} {p.name}</option>)}
                          </select>
                        </div>
                        <input 
                          type="number" 
                          className="p-2.5 bg-white border rounded-xl text-center text-[11px] font-bold outline-none w-full shadow-sm"
                          placeholder="0"
                          value={line.quantity || ''}
                          onChange={(e) => updateMaterialLine(idx, 'quantity', e.target.value)}
                        />
                        <input 
                          type="text" 
                          className="p-2.5 bg-white border rounded-xl text-right text-[11px] font-mono font-black text-blue-600 outline-none w-full shadow-sm"
                          value={line.price}
                          onChange={(e) => updateMaterialLine(idx, 'price', e.target.value)}
                        />
                        <div className="text-right font-mono font-black text-blue-950 pr-2 flex items-center justify-end gap-1 text-[13px] truncate">
                          {(line.total || 0).toLocaleString('ru-RU')} <span className="text-[9px] text-gray-300 font-bold uppercase">₽</span>
                        </div>
                        <button 
                          onClick={() => confirmDelete('material', idx)}
                          className="p-2 text-gray-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all flex justify-center"
                        >
                          <Trash2 size={18} />
                        </button>
                     </div>
                    );
                  })}
                </div>
                {materialLines.length === 0 && (
                  <div className="text-center py-12 sm:py-16 border-4 border-dashed border-gray-50 rounded-[2.5rem] text-gray-300">
                    <Package size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">Список материалов пуст</p>
                  </div>
                )}
             </div>
          </div>

          {/* LABOR CALCULATION */}
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                <h3 className="text-sm font-black text-emerald-950 uppercase tracking-widest flex items-center gap-3">
                   <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                     <Hammer size={18} />
                   </div>
                   Расчет работ и услуг
                </h3>
                <button 
                  onClick={addLaborLine}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                >
                   <Plus size={16} /> Добавить работу
                </button>
             </div>

             <div className="space-y-3 overflow-x-auto no-scrollbar">
                <div className="min-w-[800px] space-y-3 px-2">
                  {/* Table Headers for Labor */}
                  <div className="grid grid-cols-[140px_minmax(0,1fr)_70px_100px_120px_44px] gap-4 px-3.5 mb-1">
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter truncate">{t.category}</div>
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter truncate">Вид услуги / работы</div>
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter text-center truncate">{t.qty}</div>
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter text-right truncate">{t.price}</div>
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter text-right truncate">{t.total}</div>
                     <div></div>
                  </div>

                  {laborLines.map((line, idx) => {
                    const catPos = workPositions.filter(p => p.categoryId === Number(line.categoryId));
                    return (
                     <div key={idx} className="grid grid-cols-[140px_minmax(0,1fr)_70px_100px_120px_44px] gap-4 items-center p-3.5 bg-gray-50 rounded-2xl group border border-transparent hover:border-emerald-100 transition-all">
                        <select 
                          className="p-2.5 bg-white border rounded-xl text-[11px] font-bold outline-none cursor-pointer w-full truncate shadow-sm"
                          value={line.categoryId}
                          onChange={(e) => updateLaborLine(idx, 'categoryId', e.target.value)}
                        >
                          <option value="">Тип работ...</option>
                          {workCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="min-w-0">
                          <select 
                            className="p-2.5 bg-white border rounded-xl text-[11px] font-bold outline-none truncate cursor-pointer w-full shadow-sm"
                            value={line.positionId}
                            onChange={(e) => updateLaborLine(idx, 'positionId', e.target.value)}
                          >
                            <option value="">Выберите услугу...</option>
                            {catPos.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                          </select>
                        </div>
                        <input 
                          type="number" 
                          className="p-2.5 bg-white border rounded-xl text-center text-[11px] font-bold outline-none w-full shadow-sm"
                          placeholder="0"
                          value={line.quantity || ''}
                          onChange={(e) => updateLaborLine(idx, 'quantity', e.target.value)}
                        />
                        <input 
                          type="text" 
                          className="p-2.5 bg-white border rounded-xl text-right text-[11px] font-mono font-black text-emerald-600 outline-none w-full shadow-sm"
                          value={line.price}
                          onChange={(e) => updateLaborLine(idx, 'price', e.target.value)}
                        />
                        <div className="text-right font-mono font-black text-blue-950 pr-2 flex items-center justify-end gap-1 text-[13px] truncate">
                          {(line.total || 0).toLocaleString('ru-RU')} <span className="text-[9px] text-gray-300 font-bold uppercase">₽</span>
                        </div>
                        <button 
                          onClick={() => confirmDelete('labor', idx)}
                          className="p-2 text-gray-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all flex justify-center"
                        >
                          <Trash2 size={18} />
                        </button>
                     </div>
                    );
                  })}
                </div>
                {laborLines.length === 0 && (
                  <div className="text-center py-12 sm:py-16 border-4 border-dashed border-gray-50 rounded-[2.5rem] text-gray-300">
                    <Hammer size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">Перечень работ пуст</p>
                  </div>
                )}
             </div>
          </div>
          
          {/* ACTION BUTTONS */}
          <div className="pb-20 text-center flex flex-col items-center gap-4">
             <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl max-w-lg flex items-start gap-3 text-left">
                <Info className="text-orange-500 shrink-0 mt-0.5" size={18} />
                <p className="text-[10px] font-bold text-orange-800 leading-relaxed uppercase tracking-tighter">
                   Проверьте правильность выбранных позиций и единиц измерения (м², мп). Сумма работ и материалов рассчитана автоматически без учета скидок накладной.
                </p>
             </div>
             <button 
               onClick={() => toast.success("PDF Смета успешно сформирована")}
               className="bg-blue-600 text-white px-8 sm:px-16 py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black shadow-2xl shadow-blue-400/30 hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em] text-[10px] sm:text-xs flex items-center gap-3"
             >
               <Download size={20} /> Сформировать PDF Смету
             </button>
          </div>
        </div>
      ) : (
        /* WORK CATALOG VIEW */
        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar animate-in slide-in-from-right duration-300">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-4 mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 shrink-0">
                    <Hammer size={24} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Справочник работ</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Управление прайс-листом на услуги</p>
                 </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {/* Import / Export Controls for Catalog */}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .json" />
                <button 
                  onClick={handleImportClick}
                  disabled={isImporting}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm uppercase tracking-tighter"
                >
                  <FileUp size={18} className="text-blue-600" /> {isImporting ? '...' : t.import}
                </button>

                <div className="flex border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <button 
                    onClick={exportToXLSX}
                    disabled={isExporting}
                    className="bg-white text-gray-600 px-4 py-2 hover:bg-gray-50 text-xs font-bold flex items-center gap-2 border-r border-gray-200 transition-all uppercase tracking-tighter"
                    title={t.exportXlsx}
                  >
                    <FileDown size={18} className="text-green-600" /> {t.export}
                  </button>
                  <button 
                    onClick={exportToJSON}
                    className="bg-white text-gray-400 px-2 py-2 hover:bg-gray-50 hover:text-blue-600 transition-all"
                    title={t.exportJson}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <button 
                  onClick={() => handleOpenEditModal()}
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                >
                  <Plus size={20} /> Новая услуга
                </button>
              </div>
           </div>

           {/* CATALOG CARDS GRID */}
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {workPositions.map(work => (
                <div key={work.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group relative flex flex-col justify-between min-h-[220px]">
                   <div>
                      <div className="flex justify-between items-start">
                         <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${work.categoryId === 1 ? 'bg-orange-50 border-orange-100 text-orange-600' : work.categoryId === 2 ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                            {workCategories.find(c => c.id === work.categoryId)?.name}
                         </div>
                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <button 
                              onClick={() => handleOpenEditModal(work)} 
                              className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              title="Редактировать"
                            >
                               <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => confirmDelete('catalog', work.id!, work.name)} 
                              className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              title="Удалить"
                            >
                               <Trash2 size={18} />
                            </button>
                         </div>
                      </div>
                      <h4 className="mt-6 font-black text-gray-900 text-xl leading-tight uppercase tracking-tighter">{work.name}</h4>
                   </div>

                   <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-end">
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Единица расчета</p>
                         <p className="text-sm font-bold text-gray-600">{work.unit}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Тариф</p>
                         <p className="text-3xl font-black text-blue-900 font-mono tracking-tighter">{work.price} ₽</p>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* STRICT DELETION MODAL */}
      {deleteRequest && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setDeleteRequest(null)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-red-500">
             <div className="p-6 sm:p-8 flex items-center gap-4 bg-red-500 text-white">
               <ShieldAlert className="animate-pulse" size={40} />
               <div>
                 <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-none">Критическое действие</h3>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-red-100 mt-1">Требуется строгое подтверждение</p>
               </div>
             </div>

             <div className="p-8 sm:p-10 space-y-6">
                <div className="space-y-4">
                   <p className="text-gray-900 font-black text-xl sm:text-2xl leading-tight">
                     Удалить позицию из {deleteRequest.type === 'catalog' ? 'справочника' : 'расчета'}?
                   </p>
                   <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm shrink-0">
                        {deleteRequest.type === 'material' ? <Package size={24}/> : <Hammer size={24}/>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Объект удаления:</p>
                        <p className="text-sm font-black text-blue-950 leading-tight truncate">{deleteRequest.title}</p>
                      </div>
                   </div>
                   <p className="text-[10px] text-red-500 font-black uppercase tracking-tighter text-center leading-relaxed">
                     {deleteRequest.type === 'catalog' 
                       ? 'ВНИМАНИЕ: ЭТА УСЛУГА ИСЧЕЗНЕТ ИЗ ВСЕХ БУДУЩИХ РАСЧЕТОВ!' 
                       : 'Данные об этой позиции будут стерты из текущей сметы.'}
                   </p>
                </div>
             </div>

             <div className="p-6 sm:p-8 bg-gray-50 border-t flex gap-4">
                <button 
                  onClick={() => setDeleteRequest(null)}
                  className="flex-1 py-4 sm:py-5 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-black hover:bg-gray-100 transition-all uppercase text-[10px] sm:text-[11px] tracking-widest shadow-sm"
                >
                  Отмена
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 bg-red-600 text-white py-4 sm:py-5 rounded-2xl font-black shadow-2xl shadow-red-300 hover:bg-red-700 active:scale-95 transition-all uppercase text-[10px] sm:text-[11px] tracking-widest"
                >
                   Да, удалить!
                </button>
             </div>
          </div>
        </div>
      )}

      {/* WORK EDITOR MODAL (CATALOG) */}
      {isEditModalOpen && editingWork && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-blue-50">
             <div className="p-6 sm:p-8 border-b flex justify-between items-center bg-gray-50/30">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                    <Edit3 size={20} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-blue-950 uppercase tracking-tighter truncate">
                    {editingWork.id ? 'Редактировать услугу' : 'Новая услуга'}
                  </h3>
               </div>
               <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-all">
                  <X size={24} />
               </button>
             </div>

             <div className="p-8 sm:p-10 space-y-6 sm:space-y-8">
                <div>
                   <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Наименование работы</label>
                   <input 
                     type="text" 
                     className="w-full p-4 sm:p-5 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-950 transition-all text-base sm:text-lg"
                     placeholder="Например: Укладка ламината по диагонали..."
                     value={editingWork.name}
                     onChange={(e) => setEditingWork({...editingWork, name: e.target.value})}
                   />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                   <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Группа работ</label>
                      <select 
                        className="w-full p-4 sm:p-5 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900 cursor-pointer transition-all"
                        value={editingWork.categoryId}
                        onChange={(e) => setEditingWork({...editingWork, categoryId: Number(e.target.value)})}
                      >
                         {workCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Ед. измерения</label>
                      <select 
                        className="w-full p-4 sm:p-5 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900 cursor-pointer transition-all"
                        value={editingWork.unit}
                        onChange={(e) => setEditingWork({...editingWork, unit: e.target.value})}
                      >
                         <option value="м²">кв. метр (м²)</option>
                         <option value="мп">пог. метр (мп)</option>
                         <option value="шт">штука (шт)</option>
                         <option value="рейс">выезд (рейс)</option>
                         <option value="час">час (час)</option>
                         <option value="комплект">комплект</option>
                      </select>
                   </div>
                </div>

                <div className="bg-blue-50/50 p-6 sm:p-8 rounded-3xl border border-blue-100 flex flex-col items-center gap-3">
                   <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Установленный тариф (₽)</label>
                   <div className="flex items-center gap-4 w-full">
                      <input 
                        type="number" 
                        className="w-full bg-transparent text-4xl sm:text-5xl font-black text-blue-900 outline-none text-center font-mono placeholder:text-blue-100"
                        placeholder="0.00"
                        value={editingWork.price}
                        onChange={(e) => setEditingWork({...editingWork, price: e.target.value})}
                      />
                   </div>
                   <p className="text-[9px] sm:text-[10px] font-bold text-blue-300 uppercase tracking-tighter text-center">Стоимость будет применена ко всем новым расчетам</p>
                </div>
             </div>

             <div className="p-6 sm:p-8 bg-gray-50 border-t flex gap-4">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all uppercase text-[10px] sm:text-[11px] tracking-widest shadow-sm">Отмена</button>
                <button 
                  onClick={handleSaveWork}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-2xl shadow-blue-300 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-[10px] sm:text-[11px] tracking-widest"
                >
                  <Check size={20} /> Сохранить
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
