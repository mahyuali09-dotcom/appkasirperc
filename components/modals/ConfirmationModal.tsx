import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message,
    confirmText = 'Hapus',
    cancelText = 'Batal',
    confirmButtonClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <h2 id="confirm-modal-title" className="text-xl font-semibold text-slate-800 mb-2">
                        {title}
                    </h2>
                    <p className="text-slate-600">{message}</p>
                </div>
                <div className="bg-slate-50 px-6 py-3 flex justify-end items-center gap-4 rounded-b-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2 px-4 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
