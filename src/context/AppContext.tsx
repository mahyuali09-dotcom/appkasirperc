import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../services/supabaseService';
import { 
  Transaction, ServicePrice, Expense, ReceiptSettings, 
  DiscountSettings, CashierSettings, WhatsAppSettings, ThemeSettings 
} from '../../types';
import { 
  INITIAL_PRICES, DEFAULT_RECEIPT_SETTINGS, DEFAULT_DISCOUNT_SETTINGS, 
  DEFAULT_CASHIER_SETTINGS, DEFAULT_WHATSAPP_SETTINGS, DEFAULT_THEME_SETTINGS,
  DEFAULT_LOGO_BASE64
} from '../../constants';

interface AppContextType {
  transactions: Transaction[];
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  prices: ServicePrice[];
  setPrices: (prices: ServicePrice[]) => void;
  savePrices: (prices: ServicePrice[]) => Promise<void>;

  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  receiptLogo: string | null;
  setReceiptLogo: (logo: string | null) => Promise<void>;

  receiptSettings: ReceiptSettings;
  setReceiptSettings: (settings: ReceiptSettings) => Promise<void>;

  discountSettings: DiscountSettings;
  setDiscountSettings: (settings: DiscountSettings) => Promise<void>;

  cashierSettings: CashierSettings;
  setCashierSettings: (settings: CashierSettings) => Promise<void>;

  whatsappSettings: WhatsAppSettings;
  setWhatsappSettings: (settings: WhatsAppSettings) => Promise<void>;

  themeSettings: ThemeSettings;
  setThemeSettings: (settings: ThemeSettings) => Promise<void>;

  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [prices, setPricesState] = useState<ServicePrice[]>(INITIAL_PRICES);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [receiptLogo, setReceiptLogoState] = useState<string | null>(DEFAULT_LOGO_BASE64);
  const [receiptSettings, setReceiptSettingsState] = useState<ReceiptSettings>(DEFAULT_RECEIPT_SETTINGS);
  const [discountSettings, setDiscountSettingsState] = useState<DiscountSettings>(DEFAULT_DISCOUNT_SETTINGS);
  const [cashierSettings, setCashierSettingsState] = useState<CashierSettings>(DEFAULT_CASHIER_SETTINGS);
  const [whatsappSettings, setWhatsappSettingsState] = useState<WhatsAppSettings>(DEFAULT_WHATSAPP_SETTINGS);
  const [themeSettings, setThemeSettingsState] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  
  const [isLoading, setIsLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        txs, prcs, exps, logo, rSettings, dSettings, cSettings, wSettings, tSettings
      ] = await Promise.all([
        db.getTransactions(),
        db.getPrices(),
        db.getExpenses(),
        db.getSetting('receiptLogo', DEFAULT_LOGO_BASE64),
        db.getSetting('receiptSettings', DEFAULT_RECEIPT_SETTINGS),
        db.getSetting('discountSettings', DEFAULT_DISCOUNT_SETTINGS),
        db.getSetting('cashierSettings', DEFAULT_CASHIER_SETTINGS),
        db.getSetting('whatsappSettings', DEFAULT_WHATSAPP_SETTINGS),
        db.getSetting('themeSettings', DEFAULT_THEME_SETTINGS)
      ]);

      setTransactionsState(txs);
      if (prcs.length > 0) setPricesState(prcs);
      setExpensesState(exps);
      setReceiptLogoState(logo);
      setReceiptSettingsState(rSettings);
      setDiscountSettingsState(dSettings);
      setCashierSettingsState(cSettings);
      setWhatsappSettingsState(wSettings);
      setThemeSettingsState(tSettings);
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const addTransaction = async (tx: Transaction): Promise<boolean> => {
    const success = await db.saveTransaction(tx);
    if (success) {
      setTransactionsState(prev => [tx, ...prev]);
      return true;
    }
    return false;
  };

  const updateTransaction = async (tx: Transaction): Promise<boolean> => {
    const success = await db.saveTransaction(tx);
    if (success) {
      setTransactionsState(prev => prev.map(t => t.id === tx.id ? tx : t));
      return true;
    }
    return false;
  };

  const deleteTransaction = async (id: string) => {
    const success = await db.deleteTransaction(id);
    if (success) setTransactionsState(prev => prev.filter(t => t.id !== id));
  };

  const savePrices = async (newPrices: ServicePrice[]) => {
    const success = await db.savePrices(newPrices);
    if (success) setPricesState(newPrices);
  };

  const addExpense = async (expense: Expense) => {
    const success = await db.saveExpense(expense);
    if (success) setExpensesState(prev => [expense, ...prev]);
  };

  const deleteExpense = async (id: string) => {
    const success = await db.deleteExpense(id);
    if (success) setExpensesState(prev => prev.filter(e => e.id !== id));
  };

  const updateSetting = async (key: string, value: any, setter: (val: any) => void) => {
    const success = await db.saveSetting(key, value);
    if (success) setter(value);
  };

  const value: AppContextType = {
    transactions,
    setTransactions: setTransactionsState,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    prices,
    setPrices: setPricesState,
    savePrices,
    expenses,
    setExpenses: setExpensesState,
    addExpense,
    deleteExpense,
    receiptLogo,
    setReceiptLogo: (val) => updateSetting('receiptLogo', val, setReceiptLogoState),
    receiptSettings,
    setReceiptSettings: (val) => updateSetting('receiptSettings', val, setReceiptSettingsState),
    discountSettings,
    setDiscountSettings: (val) => updateSetting('discountSettings', val, setDiscountSettingsState),
    cashierSettings,
    setCashierSettings: (val) => updateSetting('cashierSettings', val, setCashierSettingsState),
    whatsappSettings,
    setWhatsappSettings: (val) => updateSetting('whatsappSettings', val, setWhatsappSettingsState),
    themeSettings,
    setThemeSettings: (val) => updateSetting('themeSettings', val, setThemeSettingsState),
    isLoading,
    refreshData: loadAllData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
