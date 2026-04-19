import React, { useState, useMemo, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useApp } from '../src/context/AppContext';
import { Expense } from '../types';
import Card from '../components/ui/Card';
import ConfirmationModal from '../components/modals/ConfirmationModal';

const BLANK_FORM: Omit<Expense, 'id' | 'timestamp'> = {
    date: new Date().toISOString().split('T')[0],
    name: '',
    category: '',
    amount: 0,
    notes: ''
};

const ExpensesPage: React.FC = () => {
    const { expenses, addExpense, deleteExpense } = useApp();
    const [formData, setFormData] = useState(BLANK_FORM);
    const [editModeId, setEditModeId] = useState<string | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

    const formatCurrency = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
    const formatNumber = (amount: number) => new Intl.NumberFormat('id-ID', { useGrouping: false }).format(amount);

    const existingCategories = useMemo(() => {
        const categories = expenses.map(e => e.category.trim()).filter(Boolean);
        return [...new Set(categories)];
    }, [expenses]);

    useEffect(() => {
        if (!editModeId) {
            setFormData(BLANK_FORM);
        }
    }, [editModeId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
        setFormData(prev => ({ ...prev, amount: numericValue }));
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.category.trim() || formData.amount <= 0) {
            alert('Nama, Kategori, dan Jumlah Pengeluaran tidak boleh kosong.');
            return;
        }

        if (editModeId) {
            // Update
            const updatedExpense = {
                ...expenses.find(e => e.id === editModeId)!,
                ...formData,
                amount: Number(formData.amount)
            };
            await addExpense(updatedExpense);
            alert('Pengeluaran berhasil diperbarui.');
        } else {
            // Add new
            const newExpense: Expense = {
                id: new Date().getTime().toString(),
                timestamp: new Date(`${formData.date}T00:00:00`).getTime(),
                ...formData,
                amount: Number(formData.amount),
                notes: formData.notes?.trim() || undefined
            };
            await addExpense(newExpense);
            alert('Pengeluaran berhasil disimpan.');
        }
        setEditModeId(null);
    };

    const handleEditClick = (expense: Expense) => {
        setEditModeId(expense.id);
        setFormData({
            date: expense.date,
            name: expense.name,
            category: expense.category,
            amount: expense.amount,
            notes: expense.notes || '',
        });
    };

    const handleDeleteClick = (expense: Expense) => {
        setExpenseToDelete(expense);
    };

    const handleConfirmDelete = async () => {
        if (expenseToDelete) {
            await deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
        }
    };

    const sortedExpenses = useMemo(() => {
        return [...expenses].sort((a, b) => b.timestamp - a.timestamp);
    }, [expenses]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
            <div className="lg:col-span-1">
                <Card title={editModeId ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}>
                    <form onSubmit={handleSaveExpense} className="space-y-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-slate-600">Tanggal</label>
                            <input type="date" name="date" id="date" value={formData.date} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-600">Nama Pengeluaran</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required placeholder="Contoh: Beli Tinta Printer" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-600">Kategori</label>
                            <input type="text" name="category" id="category" value={formData.category} onChange={handleInputChange} required list="categories" placeholder="Contoh: Bahan Baku" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            <datalist id="categories">
                                {existingCategories.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-slate-600">Jumlah (Rp)</label>
                            <input type="text" name="amount" id="amount" value={new Intl.NumberFormat('id-ID').format(formData.amount)} onChange={handleAmountChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-slate-600">Catatan (Opsional)</label>
                            <textarea name="notes" id="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                        </div>
                        <div className="flex items-center gap-4">
                            <button type="submit" className="flex-1 justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                {editModeId ? 'Update' : 'Simpan'}
                            </button>
                            {editModeId && (
                                <button type="button" onClick={() => setEditModeId(null)} className="py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-base font-medium text-slate-700 bg-white hover:bg-slate-50">
                                    Batal
                                </button>
                            )}
                        </div>
                    </form>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card title="Daftar Pengeluaran">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 responsive-table">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Tanggal</th>
                                    <th scope="col" className="px-6 py-3">Deskripsi</th>
                                    <th scope="col" className="px-6 py-3 text-right">Jumlah</th>
                                    <th scope="col" className="px-6 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedExpenses.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-slate-400">Belum ada pengeluaran tercatat.</td></tr>
                                ) : (
                                    sortedExpenses.map(exp => (
                                        <tr key={exp.id} className="bg-white border-b hover:bg-slate-50">
                                            <td data-label="Tanggal" className="px-6 py-4 whitespace-nowrap">{new Date(exp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td data-label="Deskripsi" className="px-6 py-4">
                                                <p className="font-medium text-slate-900">{exp.name}</p>
                                                <p className="text-xs text-slate-500">{exp.category}</p>
                                            </td>
                                            <td data-label="Jumlah" className="px-6 py-4 text-right font-semibold">{formatCurrency(exp.amount)}</td>
                                            <td data-label="Aksi" className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                <button onClick={() => handleEditClick(exp)} className="font-medium text-secondary-600 hover:text-secondary-800">Edit</button>
                                                <button onClick={() => handleDeleteClick(exp)} className="font-medium text-red-600 hover:text-red-800">Hapus</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            
            <ConfirmationModal
                isOpen={!!expenseToDelete}
                onClose={() => setExpenseToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Konfirmasi Hapus Pengeluaran"
                message={`Apakah Anda yakin ingin menghapus catatan pengeluaran "${expenseToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
};

export default ExpensesPage;