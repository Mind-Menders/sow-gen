import { storeEmbeddings, queryRelevantChunks } from "./chromadb-client";
import OpenAI from "openai";

// Chunk text into manageable pieces for embedding
export function chunkText(text: string, chunkSize: number = 1000): string[] {
	const chunks = [];
	for (let i = 0; i < text.length; i += chunkSize) {
		chunks.push(text.slice(i, i + chunkSize));
	}
	return chunks;
}

// Generate embeddings for each chunk using OpenAI
export async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	const embeddings: number[][] = [];
	for (const chunk of chunks) {
		const response = await openai.embeddings.create({
			model: "text-embedding-ada-002",
			input: chunk,
		});
		embeddings.push(response.data[0].embedding);
	}
	return embeddings;
}

// Store document chunks and embeddings in ChromaDB
export async function storeDocumentVectors(documentId: string, text: string) {
	const chunks = chunkText(text);
	const embeddings = await generateEmbeddings(chunks);
	await storeEmbeddings(documentId, chunks, embeddings);
}

// Retrieve relevant chunks for a query
export async function retrieveRelevantChunks(query: string, topK: number = 5, documentId?: string): Promise<string[]> {
	return await queryRelevantChunks(query, topK, documentId);
}
