import express from "express";
import { Client } from "@notionhq/client";
import { v4 as uuid } from "uuid";

const app = express();
app.use(express.json());

// Real secret comes from docker-compose env
const notion = new Client({ auth: process.env.NOTION_API_KEY });

/* ------------------------------------------------- */
/*  POST /relay/notion/page  →  create page in DB    */
app.post("/relay/notion/page", async (req, res) => {
  const { databaseId, title, props = {} } = req.body;
  try {
    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        ...props
      }
    });
    res.json({ ok: true, id: page.id });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/* Simple health-check */
app.get("/relay/health", (_req, res) =>
  res.json({ ok: true, id: uuid(), ts: Date.now() })
);

app.listen(4000, () => console.log("Relay listening on :4000"));