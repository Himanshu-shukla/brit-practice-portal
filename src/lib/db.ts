import mongoose from 'mongoose';
const g = globalThis as unknown as { __britMongo?: Promise<typeof mongoose> };
export async function db() {
  const uri=process.env.MONGODB_URI;
  if(!uri)throw new Error('MONGODB_URI missing');
  if (!g.__britMongo) {
    g.__britMongo = mongoose.connect(uri, { maxPoolSize: 15 }).catch(e => { g.__britMongo = undefined; throw e; });
  }
  return g.__britMongo;
}
