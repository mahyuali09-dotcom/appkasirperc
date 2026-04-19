import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CashierPage from './pages/CashierPage';
import PriceListPage from './pages/PriceListPage';
import ReportsPage from './pages/ReportsPage';
import OrdersPage from './pages/OrdersPage';
import SettingsPage from './pages/SettingsPage';
import MonitoringPage from './pages/MonitoringPage';
import { useApp } from './src/context/AppContext';
import { ThemeSettings } from './types';
import { DEFAULT_THEME_SETTINGS, THEMES } from './constants';
import ReceivablesPage from './pages/ReceivablesPage';
import ExpensesPage from './pages/ExpensesPage';


function App() {
  const { themeSettings, isLoading } = useApp();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const theme = THEMES[themeSettings.primaryColor] || THEMES.blue;
    
    // Apply colors
    for (const [key, value] of Object.entries(theme)) {
        root.style.setProperty(`--color-primary-${key}`, value);
    }
    
    // Apply font family
    root.style.setProperty('--font-family-sans', `'${themeSettings.fontFamily}', sans-serif`);
    
    // Apply font size
    const html = document.querySelector('html');
    if(html) {
      html.classList.remove('text-sm', 'text-base', 'text-lg');
      html.classList.add(`text-${themeSettings.fontSize}`);
    }

  }, [themeSettings]);

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-primary-50 font-sans text-slate-800 transition-colors duration-300 relative">
        {isLoading && (
          <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-primary-600 font-medium animate-pulse">Menghubungkan ke Database Supabase...</p>
            </div>
          </div>
        )}
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
        
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
          <main className="flex-1 p-4 sm:p-6 lg:p-10 pt-20 lg:pt-10">
            <Routes>
              <Route path="/" element={<CashierPage />} />
              <Route path="/harga" element={<PriceListPage />} />
              <Route path="/pesanan" element={<OrdersPage />} />
              <Route path="/piutang" element={<ReceivablesPage />} />
              <Route path="/pengeluaran" element={<ExpensesPage />} />
              <Route path="/laporan" element={<ReportsPage />} />
              <Route path="/lacak" element={<MonitoringPage />} />
              <Route path="/pengaturan" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}

export default App;
