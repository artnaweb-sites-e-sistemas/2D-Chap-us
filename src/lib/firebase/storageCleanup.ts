import { ref, deleteObject } from 'firebase/storage';
import { storage } from './config';

function getStoragePathFromUrl(url: string): string | null {
    try {
        const parsed = new URL(url);
        const index = parsed.pathname.indexOf('/o/');
        if (index === -1) return null;
        const encodedPath = parsed.pathname.slice(index + 3);
        return decodeURIComponent(encodedPath);
    } catch {
        return null;
    }
}

export async function deleteImagesByUrl(urls: string[]): Promise<void> {
    const paths = Array.from(
        new Set(
            urls
                .map(getStoragePathFromUrl)
                .filter((p): p is string => !!p)
        )
    );

    if (paths.length === 0) return;

    await Promise.all(
        paths.map(async (path) => {
            try {
                const storageRef = ref(storage, path);
                await deleteObject(storageRef);
            } catch (error) {
                // Não bloqueia o fluxo se alguma imagem falhar para excluir
                console.error('[storageCleanup] Erro ao excluir imagem do Storage:', path, error);
            }
        })
    );
}

