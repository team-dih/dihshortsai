import "dotenv/config";
import cors from "cors";
import express from "express";
import { speechRouter } from "./speech";

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientOrigins = (process.env.CLIENT_ORIGIN
  ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000"))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (clientOrigins.length === 0) {
  throw new Error("Set CLIENT_ORIGIN to the client app's origin(s), separated by commas.");
}

app.use(cors({ origin: clientOrigins }));
app.use(express.json());
app.use("/api/speech", speechRouter);

app.get("/", (_request, response) => {
  response.json({ message: "API server is running" });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
