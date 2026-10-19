import { MongoClient } from "mongodb";

let client;

export async function getCollection() {
  if (!client) {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in .env");
    client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
  }
  return client
    .db(process.env.DB_NAME || "chatbot")
    .collection(process.env.COLLECTION || "knowledge");
}

export async function closeDb() {
  if (client) await client.close();
  client = undefined;
}
