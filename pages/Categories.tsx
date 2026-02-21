
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Layers, X, Check, FileUp, FileDown, MoreHorizontal, ShieldAlert, AlertTriangle, Download } from 'lucide-react';
import { db } from '../db';
import { Category } from '../types';
import { useStore } from '../store';
import { translations } from '../translations';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export const Categories = () => {
  const { language } = useStore();
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Clear All Confirmation State
  const [clearConfirmStep, setClearConfirmStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    refreshCategories();
  }, []);

  const refreshCategories = () => {
    setCategories(db.getCategories());
  };

  const handleOpenModal = (cat?: Category) => {
    setEditingCategory(cat || { name: '', order_index: categories.length + 1, color: '#3b82f6' });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingCategory?.name) {
      return toast.error(language === 'ru' ? 'Название обязательно' : 'Name is required');
    }

    if ('id' in editingCategory) {
      db.updateCategory(editingCategory.id as number, editingCategory);
    } else {
      db.addCategory(editingCategory as Omit<Category, 'id'>);
    }

    toast.success(language === 'ru' ? 'Категория сохранена' : 'Category saved');
    setIsModalOpen(false);
    refreshCategories();
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t.confirmDelete)) {
      db.deleteCategory(id);
      toast.success(language === 'ru' ? 'Удалено' : 'Deleted');
      refreshCategories();
    }
  };

  const handleClearAll = () => {
    db.clearCategories();
    toast.success(language === 'ru' ? 'Все категории удалены' : 'All categories deleted');
    setClearConfirmStep(0);
    refreshCategories();
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

        const catsToImport: Omit<Category, 'id'>[] = importedData.map((row, idx) => ({
          name: String(row['Название'] || row['name'] || ''),
          order_index: Number(row['Порядок'] || row['order_index'] || categories.length + idx + 1),
          color: String(row['Цвет'] || row['color'] || '#3b82f6')
        })).filter(c => c.name !== '');

        if (catsToImport.length > 0) {
          const count = db.bulkAddCategories(catsToImport);
          toast.success(`${t.importSuccess} ${count}`);
          refreshCategories();
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
      const dataToExport = categories.map(c => ({
        'ID': c.id,
        'Название': c.name,
        'Порядок': c.order_index,
        'Цвет': c.color
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");
      XLSX.writeFile(workbook, `Categories_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(language === 'ru' ? 'Excel файл скачан' : 'Excel file downloaded');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(categories, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `categories_backup_${new Date().getTime()}.json`);
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
            <Layers className="text-blue-600" />
            {t.categories}
          </h2>
          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
            {categories.length} {language === 'ru' ? 'категорий' : 'categories'}
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
            <Plus size={18} /> {t.addCategory}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-gray-100 rounded-xl shadow-sm relative no-scrollbar">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 text-[11px] uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 w-20">{t.orderIndex}</th>
              <th className="px-6 py-4 w-12">{t.categoryColor}</th>
              <th className="px-6 py-4">{t.categoryName}</th>
              <th className="px-6 py-4 text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4 font-mono font-bold text-gray-400">{cat.order_index}</td>
                <td className="px-6 py-4">
                  <div className="w-8 h-8 rounded-lg shadow-inner border border-white" style={{ backgroundColor: cat.color }} />
                </td>
                <td className="px-6 py-4 font-bold text-gray-900">{cat.name}</td>
                <td className="px-6 py-4 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenModal(cat)}
                    className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Layers size={48} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">Категории не созданы</p>
          </div>
        )}
      </div>

      {/* Clear All Double Confirmation Modal */}
      {clearConfirmStep > 0 && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setClearConfirmStep(0)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
             <div className={`p-5 flex items-center gap-3 ${clearConfirmStep === 1 ? 'bg-orange-50 border-b border-orange-100' : 'bg-red-600 border-b border-red-700'}`}>
               {clearConfirmStep === 1 ? <AlertTriangle className="text-orange-600" size={28} /> : <ShieldAlert className="text-white animate-blink" size={28} />}
               <h3 className={`text-lg font-black uppercase tracking-tighter ${clearConfirmStep === 1 ? 'text-orange-900' : 'text-white'}`}>
                 {clearConfirmStep === 1 ? 'Очистка категорий' : 'Критическое предупреждение'}
               </h3>
             </div>

             <div className="p-8 space-y-6">
                <div className="space-y-3">
                   <p className="text-gray-900 font-extrabold text-xl leading-tight">
                     {clearConfirmStep === 1 
                       ? 'Вы действительно хотите удалить ВСЕ категории?' 
                       : 'ВНИМАНИЕ! Это действие сотрет все настройки категорий!'}
                   </p>
                   <p className="text-sm text-gray-500 font-medium">
                     {clearConfirmStep === 1 
                       ? 'Рекомендуется скачать резервную копию перед продолжением.' 
                       : 'Товары, привязанные к этим категориям, могут потерять связь и отображаться некорректно.'}
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
                   {clearConfirmStep === 1 ? (language === 'ru' ? 'Продолжить' : 'Continue') : (language === 'ru' ? 'ДА, УДАЛИТЬ ВСЕ КАТЕГОРИИ' : 'YES, CLEAR ALL')}
                </button>
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 border border-blue-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">
                {editingCategory?.id ? t.editCategory : t.addCategory}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">{t.categoryName}</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                  value={editingCategory?.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">{t.orderIndex}</label>
                  <input 
                    type="number" 
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold"
                    value={editingCategory?.order_index || 0}
                    onChange={(e) => setEditingCategory({ ...editingCategory, order_index: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-widest">{t.categoryColor}</label>
                  <input 
                    type="color" 
                    className="w-full h-[52px] p-1.5 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    value={editingCategory?.color || '#3b82f6'}
                    onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
              >
                <Check size={18} /> {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
