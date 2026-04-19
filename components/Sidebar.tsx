import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    ShoppingCart, 
    Tag, 
    Receipt, 
    Wallet, 
    MinusCircle, 
    BarChart2,
    Activity, 
    Settings,
    Menu,
    X,
    ChevronRight
} from 'lucide-react';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const navLinks = [
        { to: "/", label: "Kasir", icon: ShoppingCart },
        { to: "/harga", label: "Daftar Harga", icon: Tag },
        { to: "/pesanan", label: "Pesanan", icon: Receipt },
        { to: "/piutang", label: "Piutang", icon: Wallet },
        { to: "/pengeluaran", label: "Pengeluaran", icon: MinusCircle },
        { to: "/laporan", label: "Laporan", icon: BarChart2 },
        { to: "/lacak", label: "Lacak Pesanan", icon: Activity },
        { to: "/pengaturan", label: "Pengaturan", icon: Settings },
    ];

    const linkClasses = ({ isActive }: { isActive: boolean }) => `
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
        ${isActive 
            ? 'bg-primary-500 text-white shadow-lg shadow-primary-200 translate-x-1' 
            : 'text-slate-600 hover:bg-primary-50 hover:text-primary-600'
        }
    `;

    return (
        <>
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 z-40">
                <span className="text-xl font-bold text-primary-600">AdvCash</span>
                <button 
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                    {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Backdrop for Mobile */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Desktop & Mobile */}
            <aside 
                className={`
                    fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
                    ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Brand */}
                    <div className="h-20 flex items-center px-6 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                                A
                            </div>
                            {!isCollapsed && (
                                <span className="text-xl font-bold text-slate-800 tracking-tight">AdvCash</span>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                        {navLinks.map((link) => (
                            <NavLink 
                                key={link.to} 
                                to={link.to} 
                                className={linkClasses}
                                onClick={() => setIsMobileOpen(false)}
                            >
                                <link.icon size={22} className="shrink-0" />
                                {!isCollapsed && (
                                    <span className="font-medium whitespace-nowrap">{link.label}</span>
                                )}
                                {!isCollapsed && (
                                    <ChevronRight size={16} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Collapse Toggle (Desktop only) */}
                    <div className="hidden lg:block p-4 border-t border-slate-50">
                        <button 
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        >
                            <div className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
                                <ChevronRight size={22} />
                            </div>
                            {!isCollapsed && <span className="font-medium">Sembunyikan Menu</span>}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
