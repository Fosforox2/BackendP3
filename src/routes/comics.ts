import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../mongo";
import { verifyToken } from "../middleware/verifyToken";
import axios from "axios";

export interface AuthRequest extends Request {
  user?: {
    id?: string;
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
  try {
    const userId = req.user?.id;
    const { title, page = 1, limit = 10 } = req.query;

    const query: any = { userId };

    if (title) {
      query.title = { $regex: new RegExp(title as string, "i") };
    }

    const comics = await coleccion()
      .find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .toArray();

    const total = await coleccion().countDocuments(query);

    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      comics
    });
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo los comics" });
  }
});

router.post("/", verifyToken, async (req: AuthRequest, res: Response) => {
  const { ISBN } = req.body;
  if (!ISBN) {
    return res.status(400).json({ message: "Campo requerido: ISBN" });
  }

  const newISBN = procesarISBN(ISBN);
  if (!newISBN) {
    return res.status(400).json({ message: "ISBN inválido o mal formateado" });
  }

  let title: string;
  let authors: string[] = [];
  let publishers: string[] = [];
  let year: number | null = null;

  try {
    const url = `https://openlibrary.org/isbn/${newISBN}.json`;
    const response = await axios.get(url);
    const data = response.data;

    if (!data.title) {
      return res.status(404).json({ message: "ISBN no tiene título asociado" });
    }

    title = data.title;

    if (data.publish_date) {
      const yearExtracted = parseInt(data.publish_date.match(/\d{4}/)?.[0]);
      year = isNaN(yearExtracted) ? null : yearExtracted;
    }

    if (data.authors) {
      const authorPromises = data.authors.map(async (a: any) => {
        const authorRes = await axios.get(`https://openlibrary.org${a.key}.json`);
        return authorRes.data.name;
      });
      authors = await Promise.all(authorPromises);
    }

    if (data.publishers) {
      publishers = data.publishers.map((p: any) =>
        typeof p === "string" ? p : p.name
      );
    }

  } catch (error) {
    return res.status(404).json({ message: "ISBN no existe en OpenLibrary" });
  }

  const nuevoTebeo = {
    title,
    authors,
    year,
    ISBN: newISBN,
    publishers,
    status: "pending",
    userId: req.user?.id,
    popularity: 0
  };

  const result = await coleccion().insertOne(nuevoTebeo);
  const creado = await coleccion().findOne({ _id: result.insertedId });
  res.status(201).json(creado);
});


router.put("/:id/status", verifyToken, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;

  if (status !== "read" && status !== "pending") {
    return res.status(400).json({ message: "Estado inválido: usa 'read' o 'pending'" });
  }

  const updateFields: any = { status };
  if (status === "read") {
    updateFields.$inc = { popularity: 1 };
  }

  const result = await coleccion().updateOne(
    { _id: new ObjectId(req.params.id), userId: req.user?.id },
    updateFields
  );

  if (result.modifiedCount === 0) {
    return res.status(404).json({ message: "No encontrado o sin permisos" });
  }

  res.json({ message: `Estado actualizado a '${status}'` });
});


router.get("/public", async (req: Request, res: Response) => {
  const comics = await coleccion()
    .find()
    .sort({ popularity: -1 })
    .limit(12)
    .project({ title: 1, authors: 1, popularity: 1 })
    .toArray();

  res.json(comics);
});

router.put("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  const { title, authors, year, ISBN, publishers } = req.body;

  const result = await coleccion().updateOne(
    { _id: new ObjectId(req.params.id), userId: req.user?.id },
    { $set: { title, authors, year, ISBN, publishers } }
  );

  result.modifiedCount > 0
    ? res.json({ message: "Tebeo actualizado" })
    : res.status(404).json({ message: "No encontrado o sin permisos" });
});

router.delete("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  const result = await coleccion().deleteOne({
    _id: new ObjectId(req.params.id),
    userId: req.user?.id
  });

  result.deletedCount > 0
    ? res.json({ message: "Tebeo eliminado" })
    : res.status(404).json({ message: "No encontrado o sin permisos" });
});

export default router;
