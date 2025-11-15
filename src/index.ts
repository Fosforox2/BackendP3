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
  "email": "diego1@gmail.com",
  "password": "1234"
}


{
  "email": "JavierMejorProfesor@gmail.com",
  "password": "pataton"
}


para sacar las isbns recomiendo https://www.iberlibro.com/
api usada https://openlibrary.org/isbn/


{
  "ISBN": "9780140173154"
}

{
  "ISBN": "978-8484317227"
}


*/ 
