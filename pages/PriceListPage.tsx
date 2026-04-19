import React, { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useApp } from '../src/context/AppContext';
import { INITIAL_PRICES } from '../constants';
import { ServicePrice } from '../types';
import Card from '../components/ui/Card';
import PriceFormModal from '../components/modals/PriceFormModal';
import ConfirmationModal from '../components/modals/ConfirmationModal';

const PriceListPage: React.FC = () => {
    const { prices, savePrices } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState<ServicePrice | null>(null);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

    const formatCurrency = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;

    const handleOpenFormModal = (service: ServicePrice | null) => {
        setCurrentService(service);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
        setCurrentService(null);
    };

    const handleSaveService = (serviceToSave: ServicePrice) => {
        if (serviceToSave.id) {
            // Edit existing
            savePrices(prices.map(p => p.id === serviceToSave.id ? serviceToSave : p));
        } else {
            // Add new
            const newService = { ...serviceToSave, id: new Date().getTime().toString() };
            savePrices([...prices, newService]);
        }
        handleCloseFormModal();
    };

    const handleDeleteClick = (serviceId: string) => {
        setServiceToDelete(serviceId);
        setIsDeleteConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (serviceToDelete) {
            savePrices(prices.filter(p => p.id !== serviceToDelete));
        }
        setIsDeleteConfirmModalOpen(false);
        setServiceToDelete(null);
    };

    const handleDownloadCSV = () => {
        if (prices.length === 0) {
            alert('Tidak ada data untuk diunduh.');
            return;
        }

        const headers = ['Nama Layanan', 'Harga', 'Satuan', 'Butuh Luas'];
        const rows = prices.map(p => [
            p.name,
            p.price,
            p.unit,
            p.requiresArea ? 'Ya' : 'Tidak'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `daftar-harga-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) throw new Error('File kosong.');

                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error('File tidak memiliki data (hanya header atau kosong).');

                // Simple CSV parser that handles quotes
                const parseCSVLine = (line: string) => {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                                current += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (char === ',' && !inQuotes) {
                            result.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current.trim());
                    return result;
                };

                const headers = parseCSVLine(lines[0]);
                // Expected headers: Nama Layanan, Harga, Satuan, Butuh Luas
                const importedData = lines.slice(1).map(line => {
                    const columns = parseCSVLine(line);
                    return {
                        name: columns[0],
                        price: parseFloat(columns[1]) || 0,
                        unit: columns[2],
                        requiresArea: (columns[3] || '').toLowerCase() === 'ya'
                    };
                });

                // Basic validation
                const isValid = importedData.every(item => 
                    item.name && !isNaN(item.price) && item.unit
                );

                if (!isValid) {
                    throw new Error('Format CSV tidak valid. Pastikan kolom sesuai: Nama Layanan, Harga, Satuan, Butuh Luas.');
                }

                if (window.confirm(`Apakah Anda yakin ingin mengimpor ${importedData.length} layanan dari CSV? Data ini akan menggabungkan dengan data yang sudah ada.`)) {
                    const newPrices = [...prices];
                    importedData.forEach(importedItem => {
                        const exists = newPrices.find(p => p.name.toLowerCase() === importedItem.name.toLowerCase());
                        if (exists) {
                            // Update existing
                            exists.price = importedItem.price;
                            exists.unit = importedItem.unit;
                            exists.requiresArea = importedItem.requiresArea;
                        } else {
                            // Add new
                            newPrices.push({
                                ...importedItem,
                                id: new Date().getTime().toString() + Math.random().toString(36).substr(2, 5)
                            } as ServicePrice);
                        }
                    });
                    
                    savePrices(newPrices);
                    alert('Data CSV berhasil diimpor!');
                }
            } catch (error) {
                console.error('Import error:', error);
                alert('Gagal mengimpor file CSV: ' + (error instanceof Error ? error.message : 'Format tidak dikenal'));
            }
            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };


    return (
        <div className="space-y-8 pb-8">
            <Card title="Daftar Harga Layanan">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <p className="text-slate-600">Kelola daftar layanan dan harga yang tersedia.</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".csv" 
                            className="hidden" 
                        />
                        <button
                            onClick={handleImportClick}
                            className="flex items-center gap-2 py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            <Upload size={18} />
                            Impor CSV
                        </button>
                        <button
                            onClick={handleDownloadCSV}
                            className="flex items-center gap-2 py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            <FileText size={18} />
                            Unduh CSV
                        </button>
                        <button
                            onClick={() => handleOpenFormModal(null)}
                            className="py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            Tambah Layanan
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto bg-white">
                    <table className="w-full text-sm text-left text-slate-500 responsive-table">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama Layanan</th>
                                <th scope="col" className="px-6 py-3">Harga Satuan</th>
                                <th scope="col" className="px-6 py-3">Satuan</th>
                                <th scope="col" className="px-6 py-3 text-center">Butuh Luas</th>
                                <th scope="col" className="px-6 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prices.map(service => (
                                <tr key={service.id} className="bg-white border-b hover:bg-slate-50">
                                    <td data-label="Nama Layanan" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{service.name}</td>
                                    <td data-label="Harga Satuan" className="px-6 py-4">{formatCurrency(service.price)}</td>
                                    <td data-label="Satuan" className="px-6 py-4">{service.unit}</td>
                                    <td data-label="Butuh Luas" className="px-6 py-4 text-center">{service.requiresArea ? 'Ya' : 'Tidak'}</td>
                                    <td data-label="Aksi" className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                        <button onClick={() => handleOpenFormModal(service)} className="font-medium text-secondary-600 hover:text-secondary-800">Edit</button>
                                        <button onClick={() => handleDeleteClick(service.id)} className="font-medium text-red-600 hover:text-red-800">Hapus</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <PriceFormModal
                isOpen={isFormModalOpen}
                onClose={handleCloseFormModal}
                onSave={handleSaveService}
                service={currentService}
            />

            <ConfirmationModal
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => setIsDeleteConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Konfirmasi Hapus"
                message="Apakah Anda yakin ingin menghapus layanan ini? Tindakan ini tidak dapat dibatalkan."
            />
        </div>
    );
};

export default PriceListPage;