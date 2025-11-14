import { getDb } from './mongodb';

export async function logChromaDBOperation({
  operation,
  documentId,
  query,
  resultSummary
}: {
  operation: string;
  documentId: string | string[];
  query: string;
  resultSummary: string;
}) {
  const db = getDb();
  const collection = db.collection('chromadb_logs');
  await collection.insertOne({
    timestamp: new Date(),
    operation,
    documentId,
    query,
    resultSummary,
  });
}
