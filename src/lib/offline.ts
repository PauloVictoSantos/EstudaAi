// lib/offline — IndexedDB nativo (pacote de questões + outbox de respostas). Só roda no navegador.
import type { QView } from '@/components/Question';
export interface PackQuestion extends QView { id: string; number: number; year?: number | null; area: string; subject: string; answer: string }
/** Todas as imagens do pacote, para o service worker guardar e mostrar sem conexão. */
export const packImages = (p: { questions: PackQuestion[] }) => p.questions.flatMap(q => [...(q.content ?? []).flatMap(b => (b.type === 'figure' ? [b.img] : [])), ...q.options.flatMap(o => (o.img ? [o.img.img] : [])), ...(q.original ?? []).map(r => r.img)]);
export interface Pack { version: number; createdAt: number; questions: PackQuestion[]; bytes: number }
export interface OutboxItem { id?: number; questionId: string; number: number; chosen: string; correct: boolean; createdAt: number }

const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open('estudaai', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('pack'); r.result.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true }); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode), req = fn(t.objectStore(store));
    t.oncomplete = () => res((req ? req.result : undefined) as T); t.onerror = () => rej(t.error);
  });
}
export const getPack = () => tx<Pack | undefined>('pack', 'readonly', s => s.get('current'));
export const putPack = (p: Pack) => tx<void>('pack', 'readwrite', s => s.put(p, 'current'));
export const deletePack = () => tx<void>('pack', 'readwrite', s => s.delete('current'));
export const addOutbox = (item: OutboxItem) => tx<number>('outbox', 'readwrite', s => s.add(item));
export const getOutbox = () => tx<OutboxItem[]>('outbox', 'readonly', s => s.getAll());
export const clearOutbox = () => tx<void>('outbox', 'readwrite', s => s.clear());
