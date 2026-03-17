import jsPDF from 'jspdf';
import { formatCurrency, getOrderSubtotal } from '@/lib/commerce';
import { OrderRecord } from '@/types/store';

export interface OrderPdfOptions {
    /** Exibir foto do produto ao lado de cada item */
    showProductImage?: boolean;
    /** Data URLs das imagens (uma por item, na mesma ordem de order.items); usado quando showProductImage é true */
    itemImageDataUrls?: (string | null)[];
}

const EXTERNAL_IMAGE_ORIGINS = ['firebasestorage.googleapis.com', 'storage.googleapis.com', 'storage.cloud.google.com'];

function isExternalImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return EXTERNAL_IMAGE_ORIGINS.some((o) => parsed.hostname.includes(o));
    } catch {
        return false;
    }
}

/** Carrega uma URL de imagem e retorna como data URL (para uso no PDF). Usa proxy para Firebase Storage (evita CORS). */
export async function loadImageAsDataUrl(url: string): Promise<string | null> {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:')) return url;

    const useProxy = isExternalImageUrl(url);
    const loadUrl = useProxy ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url;

    try {
        const res = await fetch(loadUrl);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        if (!useProxy) {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            resolve(null);
                            return;
                        }
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.88));
                    } catch {
                        resolve(null);
                    }
                };
                img.onerror = () => resolve(null);
                img.src = url;
            });
        }
        return null;
    }
}

// Design tokens (print-friendly light theme)
const colors = {
    primary: [15, 23, 42] as [number, number, number],      // slate-900
    secondary: [51, 65, 85] as [number, number, number],    // slate-700
    muted: [100, 116, 139] as [number, number, number],     // slate-400
    border: [226, 232, 240] as [number, number, number],    // slate-200
    accent: [59, 130, 246] as [number, number, number],     // blue-500
    bgHeader: [248, 250, 252] as [number, number, number],  // slate-50
    bgRow: [241, 245, 249] as [number, number, number],     // slate-100
};

export function buildOrderPdf(order: OrderRecord, clientName: string, options?: OrderPdfOptions): jsPDF {
    const showProductImage = options?.showProductImage && options?.itemImageDataUrls;
    const imageUrls = options?.itemImageDataUrls ?? [];
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const pageH = 297;
    const margin = 14;
    const contentW = pageW - margin * 2;
    let y = margin;

    const lineH = 3.8;
    const smallLine = 3.2;
    const sectionGap = 6;

    const drawLine = (yPos: number, color = colors.border) => {
        pdf.setDrawColor(...color);
        pdf.setLineWidth(0.2);
        pdf.line(margin, yPos, pageW - margin, yPos);
    };

    const drawRect = (x: number, yPos: number, w: number, h: number, fill?: [number, number, number]) => {
        if (fill) {
            pdf.setFillColor(...fill);
            pdf.rect(x, yPos, w, h, 'F');
        }
        pdf.setDrawColor(...colors.border);
        pdf.setLineWidth(0.15);
        pdf.rect(x, yPos, w, h, 'S');
    };

    const addText = (text: string, x: number, yPos: number, opts?: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'right' | 'center' }) => {
        pdf.setFontSize(opts?.size ?? 8);
        pdf.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
        if (opts?.color) pdf.setTextColor(...opts.color);
        pdf.text(text, x, yPos, { align: opts?.align ?? 'left' });
        if (opts?.color) pdf.setTextColor(0, 0, 0);
    };

    // ─── Header ─────────────────────────────────────────
    pdf.setFillColor(...colors.bgHeader);
    pdf.rect(0, 0, pageW, 28, 'F');
    drawLine(28, colors.border);

    addText('2D Chapéus', margin, 12, { size: 18, bold: true, color: colors.primary });
    addText('Pedido de compra', margin, 20, { size: 9, color: colors.secondary });

    const orderMeta = `#${order.id.slice(0, 8).toUpperCase()} • Emissão: ${order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'N/A'}`;
    addText(orderMeta, pageW - margin, 12, { size: 9, color: colors.secondary, align: 'right' });
    addText(`Status: ${order.status.replace('_', ' ')}`, pageW - margin, 20, { size: 9, bold: true, color: colors.accent, align: 'right' });

    y = 34;

    // ─── Dados comerciais + Endereço (2 colunas) ───────
    const colW = (contentW - 6) / 2;
    const colStartY = y;

    addText('Dados comerciais', margin, y, { size: 10, bold: true, color: colors.primary });
    y += lineH + 1;
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.secondary);
    pdf.text(`Cliente: ${order.clientName || clientName || 'Cliente'}`, margin, y);
    y += smallLine;
    pdf.text(`Pagamento: ${order.paymentMethod || 'A definir'}`, margin, y);
    y += smallLine;
    pdf.text(`Transporte: ${order.carrier || 'A definir'}`, margin, y);
    y += smallLine;
    pdf.text(`Prazo: ${order.deliveryLeadTime || 'A definir'}`, margin, y);
    y += smallLine;
    pdf.setTextColor(0, 0, 0);
    const leftBottom = y;
    y = colStartY;

    addText('Endereço de entrega', margin + colW + 6, y, { size: 10, bold: true, color: colors.primary });
    y += lineH + 1;
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.secondary);
    if (order.deliveryAddress) {
        const addr = order.deliveryAddress;
        const lines = [
            `${addr.street || 'Logradouro não informado'} ${addr.number || ''}`,
            `${addr.district || 'Bairro não informado'}`,
            `${addr.city || 'Cidade não informada'} - ${addr.uf || '--'}`,
            `CEP: ${addr.cep || 'Não informado'}`,
        ];
        lines.forEach((line) => {
            pdf.text(line, margin + colW + 6, y);
            y += smallLine;
        });
    } else {
        pdf.text('Sem endereço vinculado.', margin + colW + 6, y);
        y += smallLine;
    }
    pdf.setTextColor(0, 0, 0);
    y = Math.max(leftBottom, y) + sectionGap;

    // ─── Tabela de itens ───────────────────────────────
    addText('Itens do pedido', margin, y, { size: 10, bold: true, color: colors.primary });
    y += lineH + 2;

    const imgColW = showProductImage ? 10 : 0;
    const colProduto = margin + imgColW;
    const colQtd = margin + contentW * 0.5;
    const colUnit = margin + contentW * 0.68;
    const colTotal = pageW - margin;

    pdf.setFillColor(...colors.bgHeader);
    pdf.rect(margin, y, contentW, 6, 'F');
    pdf.setDrawColor(...colors.border);
    pdf.rect(margin, y, contentW, 6, 'S');
    addText('Produto', colProduto + 2, y + 4, { size: 7, bold: true, color: colors.secondary });
    addText('Qtd', colQtd, y + 4, { size: 7, bold: true, color: colors.secondary });
    addText('Unit.', colUnit, y + 4, { size: 7, bold: true, color: colors.secondary });
    addText('Total', colTotal - 2, y + 4, { size: 7, bold: true, color: colors.secondary, align: 'right' });
    y += 6;

    const itemCount = (order.items || []).length;
    const spaceForItems = pageH - margin - y - 42;
    const itemRowH = itemCount > 0 ? Math.max(showProductImage ? 10 : 5, Math.min(showProductImage ? 12 : 7, spaceForItems / itemCount)) : 6;
    const thumbSize = showProductImage ? Math.min(8, itemRowH - 1.5) : 0;

    (order.items || []).forEach((item, i) => {
        const qty = item.quantity || 0;
        const unit = item.unitPrice || 0;
        const tot = item.total ?? unit * qty;
        const desc = `${item.name}${item.variationName ? ` (${item.variationName})` : ''}`;
        const shortDesc = desc.length > (showProductImage ? 35 : 42) ? desc.slice(0, (showProductImage ? 32 : 39)) + '...' : desc;
        const itemImg = showProductImage ? imageUrls[i] : null;

        if (i % 2 === 1) {
            pdf.setFillColor(...colors.bgRow);
            pdf.rect(margin, y - 1, contentW, itemRowH + 1, 'F');
        }
        pdf.setDrawColor(...colors.border);
        pdf.setLineWidth(0.1);
        pdf.line(margin, y + itemRowH, pageW - margin, y + itemRowH);

        if (itemImg && thumbSize > 0) {
            try {
                const imgY = y + (itemRowH - thumbSize) / 2;
                const format = itemImg.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                pdf.addImage(itemImg, format, margin + 1, imgY, thumbSize, thumbSize);
            } catch {
                // ignora falha de imagem (CORS ou formato)
            }
        }

        pdf.setFontSize(itemCount > 25 ? 6 : 7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(shortDesc, colProduto + 2, y + itemRowH / 2 + 1);
        pdf.text(String(qty), colQtd, y + itemRowH / 2 + 1);
        pdf.text(formatCurrency(unit), colUnit, y + itemRowH / 2 + 1);
        pdf.text(formatCurrency(tot), colTotal - 2, y + itemRowH / 2 + 1, { align: 'right' });

        y += itemRowH;
    });
    y += sectionGap;

    // ─── Observações ───────────────────────────────────
    addText('Observações', margin, y, { size: 10, bold: true, color: colors.primary });
    y += lineH + 1;
    const obs = order.observations || 'Nenhuma observação enviada.';
    const obsLines = pdf.splitTextToSize(obs, contentW);
    pdf.setFontSize(7);
    pdf.setTextColor(...colors.secondary);
    obsLines.slice(0, 3).forEach((line: string) => {
        pdf.text(line, margin, y);
        y += smallLine;
    });
    pdf.setTextColor(0, 0, 0);
    y += sectionGap;

    // ─── Totais (box destacado) ────────────────────────
    const subtotal = order.subtotal || getOrderSubtotal(order.items || []);
    const total = subtotal + (order.freight || 0);
    const boxW = 70;
    const boxX = pageW - margin - boxW;
    const boxY = y;
    const boxH = 22;

    drawRect(boxX, boxY, boxW, boxH, colors.bgHeader);
    addText('Subtotal', boxX + 4, boxY + 6, { size: 8, color: colors.secondary });
    addText(formatCurrency(subtotal), boxX + boxW - 4, boxY + 6, { size: 8, align: 'right' });
    addText('Frete', boxX + 4, boxY + 11, { size: 8, color: colors.secondary });
    addText(order.freight && order.freight > 0 ? formatCurrency(order.freight) : 'A combinar', boxX + boxW - 4, boxY + 11, { size: 8, align: 'right' });
    drawLine(boxY + 14, colors.border);
    addText('TOTAL', boxX + 4, boxY + 20, { size: 11, bold: true, color: colors.primary });
    addText(formatCurrency(total), boxX + boxW - 4, boxY + 20, { size: 11, bold: true, color: colors.primary, align: 'right' });

    return pdf;
}
