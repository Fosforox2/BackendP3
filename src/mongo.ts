import { Db, MongoClient } from "mongodb";


let client: MongoClient;
let dB: Db;
const dbName = "clase_DDBB";

export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUrl = `mongodb+srv://${process.env.USER_MONGO}:${process.env.USER_PASSWORD}@${process.env.MONGO_CLUSTER}.v1bwama.mongodb.net/?appName=${process.env.MONGO_APP_NAME}`;

    client = new MongoClient(mongoUrl);
    await client.connect();
    dB = client.db(dbName);
    console.log("Connected to mongodb at db " + dbName);
  } catch (error) {
    console.log("Error mongo: ", error);
  }
};

export const getDb = ():Db => dB;