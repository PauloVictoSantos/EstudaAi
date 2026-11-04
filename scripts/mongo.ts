// npm run db → sobe um MongoDB local em 127.0.0.1:27017, sem instalação.
// Os dados ficam em ./.mongo-data e continuam lá quando você fecha (Ctrl+C) e abre de novo.
// Na primeira vez o binário do MongoDB é baixado (~70 MB) e fica em cache.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dbPath = path.resolve('.mongo-data');
const port = Number(process.env.MONGO_PORT || 27017);

async function main() {
  await mkdir(dbPath, { recursive: true });
  console.log('Iniciando o MongoDB (na primeira vez ele é baixado, aguarde)…');
  const server = await MongoMemoryServer.create({ instance: { port, dbPath, storageEngine: 'wiredTiger' } });
  console.log(`\n✓ MongoDB rodando em ${server.getUri()}  (dados em ${dbPath})`);
  console.log('  Deixe este terminal aberto. Em outro: npm run ingest  e depois  npm run dev');
  console.log('  Ctrl+C para parar (os dados ficam salvos).\n');
  const stop = async () => { await server.stop({ doCleanup: false, force: false }); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}

main().catch(e => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(/EADDRINUSE|already in use|port/i.test(msg) ? `A porta ${port} já está em uso: provavelmente já existe um MongoDB rodando.` : msg);
  process.exit(1);
});
