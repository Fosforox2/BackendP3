import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../mongo";
import { verifyToken } from "../middleware/verifyToken";
import axios from "axios";

export interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
    email?: string;
  };
}

const procesarISBN = (isbn: string): string | null => {
  if (!isbn) return null;
  const limpio = isbn.replace(/-/g, "");
  if (!/^\d+$/.test(limpio)) return null;
  if (limpio.length !== 10 && limpio.length !== 13) return null;

  return limpio;
};

const router = Router();
const coleccion = () => getDb().collection("comics");

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  const comics = await coleccion()
    .find({ userId: req.user?.userId })
    .toArray();
  res.json(comics);
});





/*
router.post("/", verifyToken, async (req: AuthRequest, res: Response) => {
  const { title, authors, year, ISBN, publisher } = req.body;
  if (!title || !authors || !year){
    return res.status(400).json({ message: "Campos requeridos: title, author, year, ISBN" });}

  const nuevoTebeo = {
    title,
    authors,
    year,
    ISBN,
    publisher: publisher || null,
    userId: req.user?.userId,
  };

  const result = await coleccion().insertOne(nuevoTebeo);
  const creado = await coleccion().findOne({ _id: result.insertedId });
  res.status(201).json(creado);
});
*/


router.post("/", verifyToken, async (req: AuthRequest, res: Response) => {
  const {ISBN} = req.body;
  let title :string;
  let authors: string[];
  let publishers: string[];
  let year: number;

  if (!ISBN){
    return res.status(400).json({ message: "Campos requeridos: ISBN" });}
  const newISBN = procesarISBN(ISBN);
  if (!newISBN) {
    return res.status(400).json({ message: "ISBN inválido o mal formateado" });
  }

  try {
    const url = `https://openlibrary.org/isbn/${newISBN}.json`;
    const response = await axios.get(url);

    console.log("ISBN encontrado:", response.data.title);
    title = response.data.title;
    authors= response.data.authors
    year = response.data.publish_date;
    publishers = response.data.authors;

    if (!response.data.title) {
      return res.status(404).json({ message: "ISBN no existe en OpenLibrary ewwe" });
    }
  } catch (error) {
    return res.status(404).json({ message: "ISBN no existe en OpenLibrary" });
  }
  const nuevoTebeo = {
    title,
    authors,
    year,
    ISBN,
    publishers: publishers || null,
    userId: req.user?.id,
  };

  const result = await coleccion().insertOne(nuevoTebeo);
  const creado = await coleccion().findOne({ _id: result.insertedId });
  res.status(201).json(creado);
});


router.put("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const { title, authors, year, ISBN, publisher } = req.body;

  const result = await coleccion().updateOne(
    { _id: new ObjectId(id), userId: req.user?.userId },
    { $set: { title, authors, year, ISBN, publisher } }
  );

  result.modifiedCount > 0
    ? res.json({ message: "Tebeo actualizado" })
    : res.status(404).json({ message: "No encontrado o sin permisos" });
});

router.delete("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const result = await coleccion().deleteOne({
    _id: new ObjectId(id),
    userId: req.user?.userId,
  });
  result.deletedCount > 0
    ? res.json({ message: "Tebeo eliminado" })
    : res.status(404).json({ message: "No encontrado o sin permisos" });
});

export default router;

