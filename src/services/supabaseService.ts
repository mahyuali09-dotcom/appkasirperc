import { supabase } from '../lib/supabase';
import { Transaction, ServicePrice, Expense, ReceiptSettings, DiscountSettings, CashierSettings, WhatsAppSettings, ThemeSettings } from '../../types';

export const db = {
  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    return data || [];
  },

  async saveTransaction(transaction: Transaction): Promise<boolean> {
    const { error } = await supabase
      .from('transactions')
      .upsert(transaction);
    
    if (error) {
      console.error('Error saving transaction:', error);
      return false;
    }
    return true;
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
    return true;
  },

  // Prices (Services)
  async getPrices(): Promise<ServicePrice[]> {
    const { data, error } = await supabase
      .from('prices')
      .select('*');
    
    if (error) {
      console.error('Error fetching prices:', error);
      return [];
    }
    return data || [];
  },

  async savePrices(prices: ServicePrice[]): Promise<boolean> {
    const { error } = await supabase
      .from('prices')
      .upsert(prices);
    
    if (error) {
      console.error('Error saving prices:', error);
      return false;
    }
    return true;
  },

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
    return data || [];
  },

  async saveExpense(expense: Expense): Promise<boolean> {
    const { error } = await supabase
      .from('expenses')
      .upsert(expense);
    
    if (error) {
      console.error('Error saving expense:', error);
      return false;
    }
    return true;
  },

  async deleteExpense(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting expense:', error);
      return false;
    }
    return true;
  },

  // Settings
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // Ignore "no rows found"
        console.error(`Error fetching setting ${key}:`, error);
      }
      return defaultValue;
    }
    return data?.value || defaultValue;
  },

  async saveSetting(key: string, value: any): Promise<boolean> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value });
    
    if (error) {
      console.error(`Error saving setting ${key}:`, error);
      return false;
    }
    return true;
  }
};
