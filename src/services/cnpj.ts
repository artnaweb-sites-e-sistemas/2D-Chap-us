export interface CnpjInfo {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    cep: string;
    uf: string;
    municipio: string;
    bairro: string;
    logradouro: string;
    numero: string;
    complemento: string;
    email: string;
    telefone: string;
}

export async function fetchCnpjInfo(cnpj: string): Promise<CnpjInfo | null> {
    const cleanCnpj = cnpj.replace(/[^0-9]/g, '');
    if (cleanCnpj.length !== 14) return null;

    const provider = process.env.NEXT_PUBLIC_CNPJ_PROVIDER || 'brasilapi';

    try {
        if (provider === 'brasilapi') {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();

            return {
                razao_social: data.razao_social || '',
                nome_fantasia: data.nome_fantasia || '',
                cnpj: data.cnpj || '',
                cep: data.cep || '',
                uf: data.uf || '',
                municipio: data.municipio || '',
                bairro: data.bairro || '',
                logradouro: data.logradouro || '',
                numero: data.numero || '',
                complemento: data.complemento || '',
                email: data.email || '',
                telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
            };
        }

        // Add other providers (like ReceitaWS) as fallback here if needed
        // For now returning null forces manual edit gracefully

    } catch (error) {
        console.error('Error fetching CNPJ data:', error);
        // Simple fallback: return null to let user type manually
        return null;
    }

    return null;
}
