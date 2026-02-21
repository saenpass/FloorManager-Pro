
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Package, Search, Filter, X, Check, ChevronLeft, ChevronRight, FileUp, FileDown, MoreHorizontal, ShieldAlert, AlertTriangle, Info, Download } from 'lucide-react';
import { db } from '../db';
import { Position, Category } from '../types';
import { useStore } from '../store';
import { translations } from '../translations';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 50;
const UNITS = ['м²', 'м³', 'мп', 'шт', 'л', 'кг', 'км', 'комплект', 'доставка', 'поездка'];

export const Positions = () => {
  const { language } = useStore();
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [positions, setPositions] = useState<Position[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Partial<Position> | null>(null);

  // Clear All Confirmation State
  const [clearConfirmStep, setClearConfirmStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setPositions(db.getPositions());
    setCategories(db.getCategories());
  };

  const filteredPositions = useMemo(() => {
    return positions.filter(p => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(search) || 
                           p.brand.toLowerCase().includes(search) ||
                           p.id.toString().includes(search);
      const matchesCategory = filterCategory === 'all' || p.categoryId === Number(filterCategory);
      return matchesSearch && matchesCategory;
    });
  }, [positions, searchTerm, filterCategory]);

  const totalPages = Math.ceil(filteredPositions.length / ITEMS_PER_PAGE);
  const paginatedPositions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPositions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPositions, currentPage]);

  const handleOpenModal = (pos?: Position) => {
    setEditingPos(pos || { brand: '', name: '', categoryId: categories[0]?.id, price: '0', unit: UNITS[0], quantity: 1 });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingPos?.name || !editingPos?.brand) {
      return toast.error(language === 'ru' ? 'Заполните обязательные поля' : 'Fill required fields');
    }
    if ('id' in editingPos) {
      db.updatePosition(editingPos.id as number, editingPos);
    } else {
      db.addPosition(editingPos as Omit<Position, 'id'>);
    }
    toast.success(language === 'ru' ? 'Товар сохранен' : 'Product saved');
    setIsModalOpen(false);
    refreshData();
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t.confirmDelete)) {
      db.deletePosition(id);
      toast.success(language === 'ru' ? 'Удалено' : 'Deleted');
      refreshData();
    }
  };

  const handleClearAll = () => {
    db.clearPositions();
    toast.success(language === 'ru' ? 'Все товары удалены' : 'All products deleted');
    setClearConfirmStep(0);
    refreshData();
  };

  // --- IMPORT LOGIC ---
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

        const positionsToImport: Omit<Position, 'id'>[] = importedData.map(row => {
          const catName = row['Категория'] || row['category'] || '';
          const category = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          
          return {
            brand: String(row['Бренд'] || row['brand'] || 'Без бренда'),
            name: String(row['name'] || row['Название'] || ''),
            categoryId: category ? category.id : (categories[0]?.id || 1),
            price: String(row['price'] || row['Цена'] || '0'),
            unit: String(row['unit'] || row['Ед. изм.'] || UNITS[0]),
            quantity: Number(row['quantity'] || row['Остаток'] || row['Количество'] || 0),
            external_id: String(row['external_id'] || row['id'] || '')
          };
        }).filter(p => p.name !== '');

        if (positionsToImport.length > 0) {
          const count = db.bulkAddPositions(positionsToImport);
          toast.success(`${t.importSuccess} ${count}`);
          refreshData();
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

  // --- EXPORT LOGIC ---
  const exportToXLSX = () => {
    setIsExporting(true);
    try {
      const dataToExport = filteredPositions.map(p => {
        const cat = categories.find(c => c.id === p.categoryId);
        return {
          'ID': p.id,
          'Бренд': p.brand,
          'Название': p.name,
          'Категория': cat?.name || 'Без категории',
          'Цена': p.price,
          'Ед. изм.': p.unit,
          'Остаток': p.quantity,
          'Внешний ID': p.external_id || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Positions");
      XLSX.writeFile(workbook, `Positions_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success(language === 'ru' ? 'Excel файл скачан' : 'Excel file downloaded');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(positions, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `positions_backup_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success(language === 'ru' ? 'JSON файл скачан' : 'JSON file downloaded');
  };

  return (
    <div className="p-6 h-full flex flex-col bg-white">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-blue-900">
            <Package className="text-blue-600" />
            {t.products}
          </h2>
          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
            {filteredPositions.length} {language === 'ru' ? 'позиций' : 'items'}
          </span>
        </div>
        
        <div className="flex gap-2">
          {/* Clear All Button */}
          <button 
            onClick={() => setClearConfirmStep(1)}
            className="border border-red-200 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 text-sm font-semibold flex items-center gap-2 transition-all"
          >
            <Trash2 size={18} /> {language === 'ru' ? 'Очистить всё' : 'Clear All'}
          </button>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .json" />
          <button 
            onClick={handleImportClick}
            disabled={isImporting}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <FileUp size={18} className="text-blue-600" /> {isImporting ? '...' : t.import}
          </button>

          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button 
              onClick={exportToXLSX}
              disabled={isExporting}
              className="bg-white text-gray-600 px-4 py-2 hover:bg-gray-50 text-sm font-semibold flex items-center gap-2 border-r border-gray-200 transition-all"
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
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> {t.addPosition}
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={t.searchProduct}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select 
            className="border rounded-md px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">{t.allCategories}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-gray-100 rounded-xl shadow-sm relative no-scrollbar">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 text-[11px] uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 w-16 text-center">ID</th>
              <th className="px-6 py-4 w-40">{t.brand}</th>
              <th className="px-6 py-4">{t.productName}</th>
              <th className="px-6 py-4">{t.category}</th>
              <th className="px-6 py-4 text-right">{t.price}</th>
              <th className="px-6 py-4 w-20 text-center">{t.unit}</th>
              <th className="px-6 py-4 text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedPositions.map((pos) => {
              const cat = categories.find(c => c.id === pos.categoryId);
              return (
                <tr key={pos.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 text-center font-mono text-gray-400 text-xs">{pos.id}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded text-[10px] truncate block max-w-[120px]">
                      {pos.brand}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 leading-tight">{pos.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap" style={{ backgroundColor: cat?.color + '20', color: cat?.color }}>
                      {cat?.name || '...'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-right text-blue-900">{pos.price}</td>
                  <td className="px-6 py-4 text-center text-gray-500 font-medium">{pos.unit}</td>
                  <td className="px-6 py-4 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(pos)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-all"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(pos.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-all"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {paginatedPositions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package size={48} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">Ничего не найдено</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div className="text-sm font-medium text-gray-500">
          {language === 'ru' ? 'Показано' : 'Showing'} <span className="text-blue-600">{paginatedPositions.length}</span> {language === 'ru' ? 'из' : 'of'} <span className="text-gray-900">{filteredPositions.length}</span>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="bg-white border border-gray-200 px-4 py-1.5 rounded-md font-bold text-sm shadow-sm">
            {currentPage} / {totalPages || 1}
          </div>
          <button 
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Clear All Double Confirmation Modal */}
      {clearConfirmStep > 0 && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setClearConfirmStep(0)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
             <div className={`p-5 flex items-center gap-3 ${clearConfirmStep === 1 ? 'bg-orange-50 border-b border-orange-100' : 'bg-red-600 border-b border-red-700'}`}>
               {clearConfirmStep === 1 ? <AlertTriangle className="text-orange-600" size={28} /> : <ShieldAlert className="text-white animate-blink" size={28} />}
               <h3 className={`text-lg font-black uppercase tracking-tighter ${clearConfirmStep === 1 ? 'text-orange-900' : 'text-white'}`}>
                 {clearConfirmStep === 1 ? 'Очистка базы товаров' : 'Критическое предупреждение'}
               </h3>
             </div>

             <div className="p-8 space-y-6">
                <div className="space-y-3">
                   <p className="text-gray-900 font-extrabold text-xl leading-tight">
                     {clearConfirmStep === 1 
                       ? 'Вы действительно хотите удалить ВСЕ позиции товаров?' 
                       : 'ВНИМАНИЕ! Это действие необратимо и сотрет всю номенклатуру!'}
                   </p>
                   <p className="text-sm text-gray-500 font-medium">
                     {clearConfirmStep === 1 
                       ? 'Мы настоятельно рекомендуем скачать резервную копию перед продолжением.' 
                       : 'Все данные о товарах будут удалены. Заказы, ссылающиеся на эти товары, могут отображаться некорректно.'}
                   </p>
                </div>

                {clearConfirmStep === 1 && (
                  <button 
                    onClick={exportToJSON}
                    className="w-full py-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-all shadow-sm group"
                  >
                    <Download size={20} className="group-hover:translate-y-0.5 transition-transform" /> 
                    {language === 'ru' ? 'Скачать резервную копию (JSON)' : 'Download Backup (JSON)'}
                  </button>
                )}
             </div>

             <div className="p-6 bg-gray-50 border-t flex gap-3">
                <button 
                  onClick={() => setClearConfirmStep(0)}
                  className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-sm"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={() => clearConfirmStep === 1 ? setClearConfirmStep(2) : handleClearAll()}
                  className={`flex-1 text-white py-3.5 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${clearConfirmStep === 1 ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                   {clearConfirmStep === 1 ? (language === 'ru' ? 'Продолжить' : 'Continue') : (language === 'ru' ? 'ДА, УДАЛИТЬ ВСЁ' : 'YES, CLEAR ALL')}
                </button>
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 border border-blue-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">
                {editingPos?.id ? t.editPosition : t.addPosition}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">{t.brand}</label>
                  <input type="text" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold" value={editingPos?.brand || ''} onChange={(e) => setEditingPos({ ...editingPos, brand: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">{t.productName}</label>
                  <textarea rows={3} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm" value={editingPos?.name || ''} onChange={(e) => setEditingPos({ ...editingPos, name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">{t.category}</label>
                  <select className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold" value={editingPos?.categoryId} onChange={(e) => setEditingPos({ ...editingPos, categoryId: Number(e.target.value) })}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">{t.price}</label>
                    <input type="text" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-blue-700 transition-all" value={editingPos?.price || ''} onChange={(e) => setEditingPos({ ...editingPos, price: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">{t.unit}</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold cursor-pointer" 
                      value={editingPos?.unit || UNITS[0]} 
                      onChange={(e) => setEditingPos({ ...editingPos, unit: e.target.value })}
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">{t.cancel}</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]">
                <Check size={18} /> {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
