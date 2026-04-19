import React, { useState, useEffect } from 'react';

interface GlobalDiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (percentage: number) => void;
}

const GlobalDiscountModal: React.FC<GlobalDiscountModalProps> = ({ isOpen, onClose, onApply }) => {
    const [percentage, setPercentage] = useState<number | string>('');

    useEffect(() => {
        if (!isOpen) {
            setPercentage('');
        }
    }, [isOpen]);
    
    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();
        const numericPercentage = Number(percentage);
        if (!isNaN(numericPercentage) && numericPercentage >= 0 && numericPercentage <= 100) {
            onApply(numericPercentage);
        } else {
            alert('Harap masukkan persentase diskon yang valid (0-100).');
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-discount-modal-title"
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-sm"
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleApply}>
                    <div className="p-6">
                        <h2 id="global-discount-modal-title" className="text-xl font-semibold text-slate-800 mb-4">
                            Atur Diskon Global
                        </h2>
                        <p className="text-sm text-slate-600 mb-4">
                            Masukkan persentase diskon yang akan diterapkan ke semua layanan. Ini akan menimpa diskon individual yang ada.
                        </p>
                        <div>
                            <label htmlFor="globalDiscount" className="block text-sm font-medium text-slate-600">Persentase Diskon</label>
                            <div className="relative mt-1 rounded-md shadow-sm">
                                <input 
                                    type="number" 
                                    name="globalDiscount" 
                                    id="globalDiscount" 
                                    value={percentage}
                                    onChange={(e) => setPercentage(e.target.value)}
                                    className="block w-full rounded-md border-slate-300 pl-4 pr-8 focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                                    placeholder="e.g., 10"
                                    min="0"
                                    max="100"
                                    autoFocus
                                />
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500 sm:text-sm">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-6 py-3 flex justify-end items-center gap-4 rounded-b-lg">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">
                            Batal
                        </button>
                        <button type="submit" className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                            Terapkan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GlobalDiscountModal;
