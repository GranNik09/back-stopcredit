import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

/* =====================
   Supabase
===================== */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL или SUPABASE_KEY не заданы!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('✅ Supabase подключен');

/* =====================
   ROOT
===================== */
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'StopCredit backend' });
});

/* =====================
   AUTH
===================== */
app.post('/auth', async (req, res) => {
  try {
    console.log('👉 /auth called', req.body);
    const { telegram_id } = req.body;

    if (!telegram_id) return res.status(400).json({ error: 'telegram_id missing' });

    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ telegram_id })
        .select()
        .single();
      if (insertError) throw insertError;
      user = newUser;
    }

    console.log('✅ AUTH OK:', user);
    res.json(user);
  } catch (err) {
    console.error('❌ AUTH ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================
   Создать долг / кредит
===================== */
app.post('/obligation', async (req, res) => {
  try {
    const { user_id, type, name, amount } = req.body;
    const { data, error } = await supabase
      .from('obligations')
      .insert({
        user_id,
        type,
        name,
        initial_amount: amount,
        current_amount: amount,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================
   Платёж
===================== */
app.post('/payment', async (req, res) => {
  try {
    const { obligation_id, amount } = req.body;

    await supabase.from('payments').insert({ obligation_id, amount });

    const { data: obligation } = await supabase
      .from('obligations')
      .select('*')
      .eq('id', obligation_id)
      .single();

    await supabase
      .from('obligations')
      .update({ current_amount: Math.max(0, obligation.current_amount - amount) })
      .eq('id', obligation_id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================
   Получить состояние пользователя
===================== */
app.get('/state/:user_id', async (req, res) => {
  try {
    const user_id = req.params.user_id;
    const { data, error } = await supabase
      .from('obligations')
      .select('*, payments(*)')
      .eq('user_id', user_id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================
   Запуск сервера
===================== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Backend запущен на порту ${PORT}`));
