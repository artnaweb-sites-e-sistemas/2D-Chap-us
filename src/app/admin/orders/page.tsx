'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Search, Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { collection, getDocs, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getOrderSubtotal } from '@/lib/commerce';
import { OrderRecord } from '@/types/store';

interface OrderData {
    id: string;
    client: string;
    subtotal: number;
    freight: number;
    total: number;
    status: string;
    date: string;
    dateValue?: Date;
    carrier?: string;
}

// Utilidades para datas no formato brasileiro (dd/mm/aaaa)
function parseDateBR(value: string): Date | undefined {
    if (!value || !/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return undefined;
    const [d, m, y] = value.split('/').map(Number);
    const monthIndex = m - 1;
    if (monthIndex < 0 || monthIndex > 11) return undefined;
    const date = new Date(y, monthIndex, d);
    if (date.getFullYear() !== y || date.getMonth() !== monthIndex || date.getDate() !== d) return undefined;
    return date;
}

function formatDateBR(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

function maskDateBR(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

const COLUMNS = [
    { id: 'novo', title: 'Novo', color: 'bg-blue-50/50 border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    { id: 'aguardando_aprovacao', title: 'Aprovação', color: 'bg-amber-50/50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    { id: 'aprovado', title: 'Aprovado', color: 'bg-indigo-50/50 border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
    { id: 'em_separacao', title: 'Separação', color: 'bg-purple-50/50 border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
    { id: 'faturado', title: 'Faturado', color: 'bg-emerald-50/50 border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
    { id: 'enviado', title: 'Enviado', color: 'bg-teal-50/50 border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700' },
    { id: 'entregue', title: 'Entregue', color: 'bg-zinc-50 border-zinc-200', text: 'text-zinc-700', badge: 'bg-zinc-200 text-zinc-700' },
    { id: 'cancelado', title: 'Cancelado', color: 'bg-red-50/50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
];

interface DateFilterFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

function DateFilterField({ label, value, onChange }: DateFilterFieldProps) {
    const [open, setOpen] = useState(false);
    const selectedDate = parseDateBR(value);

    return (
        <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-muted-foreground">{label}</label>
            <div className="relative">
                <Input
                    type="text"
                    placeholder="dd/mm/aaaa"
                    value={value}
                    onChange={(e) => onChange(maskDateBR(e.target.value))}
                    onFocus={() => setOpen(true)}
                    className="w-full sm:w-36 h-10 bg-white pr-9"
                    maxLength={10}
                />
                <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    <CalendarIcon className="h-4 w-4" />
                </button>
                {open && (
                    <div className="absolute right-0 z-30 mt-2 rounded-lg border border-border bg-popover p-2 shadow-lg">
                        <DayPicker
                            mode="single"
                            locale={ptBR}
                            selected={selectedDate}
                            onSelect={(date) => {
                                if (!date) return;
                                onChange(formatDateBR(date));
                                setOpen(false);
                            }}
                            weekStartsOn={1}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminOrdersPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando pedidos...</div>}>
            <OrdersContent />
        </Suspense>
    );
}

function OrdersContent() {
    const searchParams = useSearchParams();
    const filterParams = searchParams.get('filter'); // 'pending', 'faturado', null

    const [viewMode, setViewMode] = useState<'kanban' | 'list'>(filterParams ? 'list' : 'kanban');
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState(filterParams === 'faturado' ? 'faturado' : '');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDraggingScroll, setIsDraggingScroll] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                const fetched: OrderData[] = [];
                snap.forEach(doc => {
                    const data = doc.data() as Omit<OrderRecord, 'id'>;
                    let dateStr = '';
                    if (data.createdAt) {
                        const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt.seconds * 1000);
                        dateStr = dateObj.toLocaleDateString('pt-BR');
                    }
                    const fallbackSubtotal = getOrderSubtotal(data.items || []);
                    const docSubtotal = data.subtotal || fallbackSubtotal;
                    const docFreight = data.freight || 0;
                    const docTotal = docSubtotal + docFreight;

                    fetched.push({
                        id: doc.id,
                        client: data.clientName || 'Cliente Desconhecido',
                        subtotal: docSubtotal,
                        freight: docFreight,
                        total: docTotal,
                        status: data.status,
                        date: dateStr,
                        dateValue: data.createdAt
                            ? data.createdAt.toDate
                                ? data.createdAt.toDate()
                                : new Date(data.createdAt.seconds * 1000)
                            : undefined,
                        carrier: data.carrier || '',
                    });
                });
                setOrders(fetched);
            } catch (err) {
                console.error("Error fetching orders", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(o => {
        let matchesFilter = true;
        if (filterParams === 'pending') {
            matchesFilter = o.status === 'novo' || o.status === 'aguardando_aprovacao';
        } else if (statusFilter) {
            matchesFilter = o.status === statusFilter;
        } else if (filterParams === 'faturado') {
            matchesFilter = o.status === 'faturado';
        }

        let matchesSearch = true;
        if (searchTerm) {
            matchesSearch = o.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.id.toLowerCase().includes(searchTerm.toLowerCase());
        }

        const fromDate = parseDateBR(dateFrom);
        const toDate = parseDateBR(dateTo);

        const matchesDateFrom = !fromDate || (o.dateValue && o.dateValue >= new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0));
        const matchesDateTo = !toDate || (o.dateValue && o.dateValue <= new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59));

        return matchesFilter && matchesSearch && matchesDateFrom && matchesDateTo;
    });

    const handleDragStart = (e: React.DragEvent, orderId: string) => {
        e.dataTransfer.setData('orderId', orderId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Allow drop
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData('orderId');
        if (!orderId) return;

        // Find current order to see if status actually changed
        const currentOrder = orders.find(o => o.id === orderId);
        if (currentOrder?.status === newStatus) return;

        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { status: newStatus });
        } catch (error) {
            console.error("Error updating order status:", error);
            alert("Erro ao atualizar o status do pedido no banco de dados.");
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDraggingScroll(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDraggingScroll(false);
    };

    const handleMouseUp = () => {
        setIsDraggingScroll(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingScroll || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gestão de Pedidos</h2>
                    <p className="text-muted-foreground">Acompanhe e movimente o fluxo dos pedidos.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-end gap-4 flex-wrap">
                    <div className="flex flex-col w-full sm:w-[250px]">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Busca</label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                type="text"
                                placeholder="Buscar cliente ou #pedido..."
                                className="pl-8 h-10 bg-white w-full"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-48">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full h-10 bg-white border-border rounded-lg shadow-sm hover:border-primary/40 transition-colors cursor-pointer"
                        >
                            <option value="">Todos os status</option>
                            <option value="novo">Novo</option>
                            <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                            <option value="aprovado">Aprovado</option>
                            <option value="em_separacao">Em Separação</option>
                            <option value="faturado">Faturado</option>
                            <option value="enviado">Enviado</option>
                            <option value="entregue">Entregue</option>
                            <option value="cancelado">Cancelado</option>
                        </Select>
                    </div>
                    <DateFilterField label="De" value={dateFrom} onChange={setDateFrom} />
                    <DateFilterField label="Até" value={dateTo} onChange={setDateTo} />
                    <div className="flex gap-2 bg-slate-200 p-1 rounded-md self-stretch items-center">
                        <button
                            className={`px-3 py-1.5 text-sm rounded transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                            onClick={() => setViewMode('kanban')}
                        >
                            Kanban
                        </button>
                        <button
                            className={`px-3 py-1.5 text-sm rounded transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                            onClick={() => setViewMode('list')}
                        >
                            Lista
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="rounded-xl border border-border bg-white p-10 text-center text-muted-foreground">
                    Carregando pedidos...
                </div>
            ) : viewMode === 'kanban' ? (
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-x-auto pb-4 cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    <div className="flex gap-4 min-w-max h-full">
                        {(statusFilter ? COLUMNS.filter(c => c.id === statusFilter) : COLUMNS).map(col => (
                            <div
                                key={col.id}
                                className={`w-[320px] rounded-xl p-4 flex flex-col gap-3 border ${col.color} min-h-0`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <h3 className={`font-semibold flex justify-between tracking-tight ${col.text}`}>
                                    {col.title}
                                    <span className={`${col.badge} px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm`}>
                                        {filteredOrders.filter(o => o.status === col.id).length}
                                    </span>
                                </h3>

                                <div className="flex-1 space-y-3 pb-1 overflow-y-auto pr-1">
                                    {filteredOrders.filter(o => o.status === col.id).map(order => (
                                        <div
                                            key={order.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, order.id)}
                                            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-slate-800 truncate max-w-[120px]">#{order.id.slice(0, 6).toUpperCase()}</span>
                                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{order.date}</span>
                                            </div>
                                            <p className="font-semibold text-slate-700 text-sm truncate mb-3">{order.client}</p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>Subtotal:</span>
                                                    <span>R$ {order.subtotal.toFixed(2).replace('.', ',')}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>Frete:</span>
                                                    <span>{order.freight > 0 ? `R$ ${order.freight.toFixed(2).replace('.', ',')}` : 'A comb.'}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>Transp.:</span>
                                                    <span>{order.carrier || 'A definir'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
                                                    <span>Total:</span>
                                                    <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
                                                </div>
                                            </div>
                                            <Link href={`/admin/orders/${order.id}`} draggable={false}>
                                                <Button variant="outline" size="sm" className="w-full mt-4 h-8 text-xs pointer-events-none group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20">Ver Detalhes</Button>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Pedido</th>
                                <th className="px-4 py-3 font-medium">Cliente</th>
                                <th className="px-4 py-3 font-medium">Data</th>
                                <th className="px-4 py-3 font-medium">Subtotal</th>
                                <th className="px-4 py-3 font-medium">Frete</th>
                                <th className="px-4 py-3 font-medium">Transportadora</th>
                                <th className="px-4 py-3 font-medium">Total</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredOrders.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum pedido encontrado.</td></tr>
                            ) : filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-muted/50">
                                    <td className="px-4 py-3 font-bold text-foreground">#{order.id.slice(0, 6)}</td>
                                    <td className="px-4 py-3 font-medium text-foreground">{order.client}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{order.date}</td>
                                    <td className="px-4 py-3 text-muted-foreground">R$ {order.subtotal.toFixed(2).replace('.', ',')}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{order.freight > 0 ? `R$ ${order.freight.toFixed(2).replace('.', ',')}` : 'Combinar'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{order.carrier || 'A definir'}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-800">R$ {order.total.toFixed(2).replace('.', ',')}</td>
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const column = COLUMNS.find(c => c.id === order.status);
                                            return (
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${column?.badge || 'bg-slate-100 text-slate-700'}`}>
                                                    {column?.title || order.status}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link href={`/admin/orders/${order.id}`}>
                                            <Button variant="ghost" size="sm">Analisar</Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
