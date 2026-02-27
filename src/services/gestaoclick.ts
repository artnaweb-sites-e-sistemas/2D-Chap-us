// src/services/gestaoclick.ts

/**
 * GestãoClick ERP Integration Service (Stub)
 * 
 * This service is prepared to structure bidirectional sync or push events
 * of Orders and Clients between the B2B Portal and GestãoClick ERP.
 * 
 * Environment Flag: NEXT_PUBLIC_ENABLE_GESTAOCLICK_INTEGRATION
 */

export interface GestaoClickOrderPayload {
    operacao: 'insert' | 'update';
    id_loja?: string;
    cliente: {
        nome_razao_social: string;
        cpf_cnpj: string;
        // ...
    };
    produtos: Array<{
        id_produto?: string;
        nome: string;
        quantidade: number;
        valor_unitario: number;
    }>;
    // ... other fields matching API spec
}

export class GestaoClickService {
    private static baseUrl = 'https://api.gestaoclick.com/v1'; // Pseudo URL or environment specific

    static get isEnabled() {
        return process.env.NEXT_PUBLIC_ENABLE_GESTAOCLICK_INTEGRATION === 'true';
    }

    static async syncOrder(order: any) {
        if (!this.isEnabled) {
            console.log('[GestãoClick Stub] Skiping sync (Integration disabled). Order:', order.id);
            return { success: true, stub: true };
        }

        try {
            // TODO: Map our Firestore `order` to `GestaoClickOrderPayload`
            // const payload = this.mapOrderToPayload(order);
            // const response = await fetch(`${this.baseUrl}/vendas`, { method: 'POST', body: JSON.stringify(payload) });

            console.log(`[GestãoClick API] Order ${order.id} sent successfully`);
            return { success: true };
        } catch (error) {
            console.error('[GestãoClick API Error]', error);
            throw error;
        }
    }
}
