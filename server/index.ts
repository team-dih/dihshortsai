import "dotenv/config";
import express from "express";
import { speechRouter } from "./speech";

const app = express();
const port = Number(process.env.PORT) || 3001;

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
