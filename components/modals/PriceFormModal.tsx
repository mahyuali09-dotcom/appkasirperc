import React, { useState, useEffect } from 'react';
import { ServicePrice } from '../../types';

interface PriceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (service: ServicePrice) => void;
    service: ServicePrice | null;
}

const PriceFormModal: React.FC<PriceFormModalProps> = ({ isOpen, onClose, onSave, service }) => {
    const [formData, setFormData] = useState<Omit<ServicePrice, 'id'> & { id?: string }>({
        name: '',
        price: 0,
        unit: '',
        requiresArea: false,
    });

    useEffect(() => {
        if (service) {
            setFormData(service);
        } else {
            setFormData({
                name: '',
                price: 0,
                unit: '',
                requiresArea: false,
            });
        }
    }, [service, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (name === 'price') {
            const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
            setFormData(prev => ({ ...prev, price: numericValue }));
        }
        else {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.name || !formData.unit) {
            alert("Nama layanan dan satuan tidak boleh kosong.");
            return;
        }
        onSave(formData as ServicePrice);
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 id="modal-title" className="text-xl font-semibold text-slate-800 mb-4">
                            {service ? 'Edit Layanan' : 'Tambah Layanan Baru'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-600">Nama Layanan</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="price" className="block text-sm font-medium text-slate-600">Harga</label>
                                    <input type="text" name="price" id="price" value={new Intl.NumberFormat('id-ID').format(formData.price)} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="unit" className="block text-sm font-medium text-slate-600">Satuan</label>
                                    <input type="text" name="unit" id="unit" value={formData.unit} onChange={handleChange} placeholder="e.g., m², pcs, box" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" required />
                                </div>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" name="requiresArea" id="requiresArea" checked={formData.requiresArea} onChange={handleChange} className="h-4 w-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500" />
                                <label htmlFor="requiresArea" className="ml-2 block text-sm text-slate-900">Membutuhkan input Luas/Panjang</label>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-6 py-3 flex justify-end items-center gap-4 rounded-b-lg">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">
                            Batal
                        </button>
                        <button type="submit" className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PriceFormModal;