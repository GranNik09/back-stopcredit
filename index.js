import dotenv from "dotenv";
import fs from "fs";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: "./.env" });

console.log("=== DEBUG START ===");
console.log("Current folder:", process.cwd());
console.log("Files:", fs.readdirSync(process.cwd()));
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY);
console.log("=== DEBUG END ===");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.post("/auth", async (req, res) => {
  const { telegram_id } = req.body;

  let { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegram_id)
    .single();

  if (!user) {
    const { data } = await supabase
      .from("users")
      .insert({ telegram_id })
      .select()
      .single();
    user = data;
  }

  res.json(user);
});

app.post("/obligation", async (req, res) => {
  const { user_id, type, name, amount } = req.body;

  const { data } = await supabase
    .from("obligations")
    .insert({
      user_id,
      type,
      name,
      initial_amount: amount,
      current_amount: amount,
    })
    .select()
    .single();

  res.json(data);
});

app.post("/payment", async (req, res) => {
  const { obligation_id, amount } = req.body;

  await supabase.from("payments").insert({
    obligation_id,
    amount,
  });

  const { data } = await supabase
    .from("obligations")
    .select("*")
    .eq("id", obligation_id)
    .single();

  await supabase
    .from("obligations")
    .update({
      current_amount: Math.max(0, data.current_amount - amount),
    })
    .eq("id", obligation_id);

  res.json({ success: true });
});

app.get("/state/:user_id", async (req, res) => {
  const user_id = req.params.user_id;

  const obligations = await supabase
    .from("obligations")
    .select("*, payments(*)")
    .eq("user_id", user_id);

  res.json(obligations.data);
});

app.listen(3000, () => {
  console.log("Backend запущен");
});
