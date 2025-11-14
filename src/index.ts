import express from "express";
import { connectMongoDB } from "./mongo";
import rutasAuth from "./routes/auth";
import comicsRouter from "./routes/comics"
import dotenv from "dotenv";

dotenv.config();

connectMongoDB();

const app = express();
app.use(express.json());
app.use("/auth", rutasAuth);
app.use("/comics", comicsRouter);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`El API ha comenzado baby en el puerto ${PORT}`));
/*

{
  "email": "JavierMejorProfesor@gmail.com",
  "password": "pataton"
}


{
  "title": "Maus",
  "authors": "Art Spiegelman",
  "year": 1991,
  "ISBN": "978-0-39474-839-5",
  "publisher": "Pantheon Books"
}

*/ 

