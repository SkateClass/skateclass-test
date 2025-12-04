const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const path = require('path');

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Инициализация Telegram Bot
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
const bot = new TelegramBot(botToken, { polling: false });

// Google Sheets API setup
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_CREDENTIALS_FILE || './credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = '1Q4otksgyU4bXfv-U9iWlXNty6j3cOSI0-WMaadCJpg0';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Main booking endpoint
app.post('/api/booking', async (req, res) => {
  try {
    const { name, age, level, phone, camps, question } = req.body;

    // Валидация данных
    if (!name || !age || !level || !phone || !camps) {
      return res.status(400).json({ 
        error: 'Все поля обязательны (кроме вопроса)' 
      });
    }

    // Форматирование данных для Google Sheets
    const timestamp = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow'
    });

    const values = [
      [timestamp, name, age, level, phone, camps, question || '']
    ];

    // Сохранение в Google Sheets
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: 'Sheet1!A:G',
      valueInputOption: 'RAW',
      resource: { values },
    });

    // Отправка уведомления в Telegram
    const message = `
🎉 <b>Новая заявка на запись!</b>

👤 <b>Имя:</b> ${name}
🎂 <b>Возраст:</b> ${age}
📊 <b>Уровень:</b> ${level}
📱 <b>Телефон:</b> ${phone}
🏕️ <b>Скейт-кэмпы:</b> ${camps}
💬 <b>Вопрос:</b> ${question || 'Не указан'}
⏰ <b>Время:</b> ${timestamp}
    `;

    await bot.sendMessage(adminTelegramId, message, { parse_mode: 'HTML' });

    // Успешный ответ
    res.json({
      success: true,
      message: 'Спасибо за заявку в Скейткласс, мы скоро свяжемся с вами!'
    });

  } catch (error) {
    console.error('Ошибка при обработке заявки:', error);
    res.status(500).json({
      error: 'Ошибка при обработке заявки. Попробуйте позже.'
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Booking endpoint: POST http://localhost:${PORT}/api/booking`);
});
