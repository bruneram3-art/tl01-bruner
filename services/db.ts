import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AppDB extends DBSchema {
    pcp_data: {
        key: string; // sap_date or similar unique key
        value: any;
    };
    metas_producao: {
        key: string;
        value: any;
    };
    diario_bordo_real: {
        key: string;
        value: any;
    };
    sync_queue: {
        key: number; // auto-increment
        value: {
            id?: number;
            action: 'insert' | 'update' | 'delete';
            table: string;
            data: any;
            timestamp: number;
        };
    };
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<AppDB>('AppIndustrialDB', 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('pcp_data')) {
                    db.createObjectStore('pcp_data', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('metas_producao')) {
                    db.createObjectStore('metas_producao', { keyPath: 'id' }); // Supposing 'id' is unique
                }
                if (!db.objectStoreNames.contains('diario_bordo_real')) {
                    db.createObjectStore('diario_bordo_real', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('sync_queue')) {
                    db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
                }
            },
        });
    }
    return dbPromise;
};

export const saveToCache = async (storeName: 'pcp_data' | 'metas_producao' | 'diario_bordo_real', data: any[]) => {
    try {
        const db = await initDB();
        const tx = db.transaction(storeName, 'readwrite');
        // Clear old cache before saving new to avoid unbounded growth
        await tx.store.clear();
        for (const item of data) {
            if (item.id) { // Ensure id exists
                await tx.store.put(item);
            }
        }
        await tx.done;
        console.log(`📦 [Offline] ${data.length} itens salvos no cache: ${storeName}`);
    } catch (error) {
        console.error(`❌ [Offline] Erro ao salvar cache em ${storeName}:`, error);
    }
};

export const loadFromCache = async (storeName: 'pcp_data' | 'metas_producao' | 'diario_bordo_real') => {
    try {
        const db = await initDB();
        const data = await db.getAll(storeName);
        console.log(`📦 [Offline] ${data.length} itens recuperados do cache: ${storeName}`);
        return data;
    } catch (error) {
        console.error(`❌ [Offline] Erro ao carregar cache de ${storeName}:`, error);
        return [];
    }
};

export const enqueueSync = async (table: string, action: 'insert' | 'update' | 'delete', data: any) => {
    try {
        const db = await initDB();
        await db.add('sync_queue', {
            action,
            table,
            data,
            timestamp: Date.now(),
        });
        console.log(`🕒 [Offline] Ação '${action}' em '${table}' enfileirada para sincronização futura.`);
    } catch (error) {
        console.error(`❌ [Offline] Erro ao adicionar na fila de sync:`, error);
    }
};

export const getSyncQueue = async () => {
    try {
        const db = await initDB();
        return await db.getAll('sync_queue');
    } catch (error) {
        console.error(`❌ [Offline] Erro ao carregar fila de sync:`, error);
        return [];
    }
};

export const clearSyncQueueItem = async (id: number) => {
    try {
        const db = await initDB();
        await db.delete('sync_queue', id);
    } catch (error) {
        console.error(`❌ [Offline] Erro ao remover item da fila de sync:`, error);
    }
};
