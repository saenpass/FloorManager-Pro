
import React from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const TabBar = () => {
  const { tabs, activeTabId, setActiveTabId, closeTab } = useStore();

  return (
    <div className="bg-gray-200 flex items-end h-10 px-2 gap-px border-b border-gray-300 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTabId(tab.id)}
          className={twMerge(
            clsx(
              "flex items-center h-8 min-w-[120px] max-w-[200px] px-3 gap-2 cursor-pointer text-xs font-medium border-x border-t border-gray-300 transition-all rounded-t-sm",
              activeTabId === tab.id ? "bg-white text-blue-900 border-b-white z-10 -mb-[1px] shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-50"
            )
          )}
        >
          <span className="truncate flex-1">{tab.title}</span>
          {tab.id !== 'dashboard' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="p-0.5 hover:bg-red-100 hover:text-red-600 rounded"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
