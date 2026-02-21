import React from 'react';
import { FileText, Receipt, Scale, TrendingUp, Percent } from 'lucide-react';
import { useStore } from '../store';

const Card = ({ icon: Icon, title, desc, onClick }: any) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-white border border-gray-100 rounded-2xl p-6 hover:bg-gray-50 transition-all shadow-sm"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-black text-gray-900 uppercase tracking-tighter">{title}</div>
        <div className="text-xs text-gray-500 font-medium mt-1">{desc}</div>
      </div>
    </div>
  </button>
);

export const Reports: React.FC = () => {
  const { openTab } = useStore();

  return (
    <div className="p-6 h-full bg-white">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl text-white flex items-center justify-center shadow-md">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Отчёты</h2>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Печать документов и управленческие отчёты
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          icon={Receipt}
          title="Печать накладной"
          desc="Выбор заказа → печать / PDF в стиле 1С"
          onClick={() => openTab('invoice-print', 'Печать накладной')}
        />
        <Card
          icon={Scale}
          title="Акт сверки"
          desc="Взаиморасчёты с клиентом за период"
          onClick={() => openTab('reconciliation', 'Акт сверки')}
        />
        <Card
          icon={TrendingUp}
          title="Отчёт по выручке"
          desc="Выручка / оплачено / дебиторка"
          onClick={() => openTab('revenue-report', 'Отчёт по выручке')}
        />
        <Card
          icon={Percent}
          title="Отчёт по скидкам"
          desc="Скидки по заказам и клиентам"
          onClick={() => openTab('discounts-report', 'Отчёт по скидкам')}
        />
      </div>
    </div>
  );
};