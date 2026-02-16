import express from "express";
import matchRouter from "#routes/matches.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Sportz API!" });
});
app.use("/matches", matchRouter);

app.listen(PORT, () => {
  console.log(`Server is listening on port http://localhost:${PORT}`);
});

export default app;
