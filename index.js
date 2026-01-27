import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// ---------------------
// Настройка сервера
// ---------------------
const app = express();
app.use(cors());
app.use(express.json());

// ---------------------
// Supabase client
// ---------------------
// Берёт URL и KEY из process.env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL или SUPABASE_KEY не заданы!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Supabase подключен");
console.log("SUPABASE_URL:", supabaseUrl);
console.log("SUPABASE_KEY:", supabaseKey?.slice(0, 10) + "...");

// ---------------------
// Авторизация пользователя
// ---------------------
app.post('/auth', async (req, res) => {
  const { telegram_id } = req.body;

  try {
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user) {
      const { data } = await supabase
        .from('users')
        .insert({ telegram_id })
        .select()
        .single();
      user = data;
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка auth' });
  }
});

// ---------------------
// Создать долг / кредит
// ---------------------
app.post('/obligation', async (req, res) => {
  const { user_id, type, name, amount } = req.body;

  try {
    const { data } = await supabase
      .from('obligations')
      .insert({
        user_id,
        type,
        name,
        initial_amount: amount,
        current_amount: amount
      })
      .select()
      .single();

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка obligation' });
  }
});

// ---------------------
// Платёж
// ---------------------
app.post('/payment', async (req, res) => {
  const { obligation_id, amount } = req.body;

  try {
    await supabase.from('payments').insert({
      obligation_id,
      amount
    });

    const { data } = await supabase
      .from('obligations')
      .select('*')
      .eq('id', obligation_id)
      .single();

    await supabase
      .from('obligations')
      .update({
        current_amount: Math.max(0, data.current_amount - amount)
      })
      .eq('id', obligation_id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка payment' });
  }
});

// ---------------------
// Получить состояние пользователя
// ---------------------
app.get('/state/:user_id', async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const { data: obligations } = await supabase
      .from('obligations')
      .select('*, payments(*)')
      .eq('user_id', user_id);

    res.json(obligations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка state' });
  }
});

// ---------------------
// Запуск сервера
// ---------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend запущен на порту ${PORT}`);
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log("DEBUG Supabase URL:", supabaseUrl);
console.log("DEBUG Supabase KEY:", supabaseKey ? supabaseKey.slice(0,10) + "..." : undefined);

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL или SUPABASE_KEY не заданы!");
  process.exit(1);
}
