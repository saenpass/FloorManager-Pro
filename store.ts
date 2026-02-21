
import { create } from 'zustand';
import { AppTab, TabType, User } from './types';
import { db } from './db';
import { Language } from './translations';

interface AppState {
  tabs: AppTab[];
  activeTabId: string;
  licenseKey: string | null;
  language: Language;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  setLanguage: (lang: Language) => void;
  setLicenseKey: (key: string) => void;
  openTab: (type: TabType, title: string, params?: any) => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  tabs: [{ id: 'dashboard', type: 'dashboard', title: 'Рабочий стол' }],
  activeTabId: 'dashboard',
  licenseKey: db.getLicense(),
  language: (localStorage.getItem('FM_LANG') as Language) || 'ru',
  currentUser: null, // User must log in if password exists

  setCurrentUser: (user) => set({ currentUser: user }),

  setLanguage: (lang) => {
    localStorage.setItem('FM_LANG', lang);
    set({ language: lang });
  },

  setLicenseKey: (key) => {
    db.saveLicense(key);
    set({ licenseKey: key });
  },

  openTab: (type, title, params) => set((state) => {
    const existingTab = state.tabs.find(t => t.type === type && JSON.stringify(t.params) === JSON.stringify(params));
    if (existingTab) {
      return { activeTabId: existingTab.id };
    }
    const id = `${type}-${Date.now()}`;
    const newTab = { id, type, title, params };
    return {
      tabs: [...state.tabs, newTab],
      activeTabId: id
    };
  }),

  closeTab: (id) => set((state) => {
    if (id === 'dashboard') return state;
    const newTabs = state.tabs.filter(t => t.id !== id);
    let nextActive = state.activeTabId;
    if (state.activeTabId === id) {
      nextActive = newTabs[newTabs.length - 1].id;
    }
    return { tabs: newTabs, activeTabId: nextActive };
  }),

  setActiveTabId: (id) => set({ activeTabId: id })
}));
