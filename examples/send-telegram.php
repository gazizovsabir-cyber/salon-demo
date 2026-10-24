<?php
/*
  Пример обработчика заявок: принимает заявку с сайта и пересылает её в Telegram.
  Работает на обычном хостинге с PHP 7.4+.

  1. Создайте бота у @BotFather и получите токен.
  2. Напишите боту любое сообщение, затем откройте
     https://api.telegram.org/bot<ТОКЕН>/getUpdates и найдите "chat":{"id": ...} — это CHAT_ID.
  3. Впишите токен и chat id ниже (или задайте переменными окружения на хостинге).
  4. Загрузите файл на хостинг, например в /send.php,
     и в assets/js/config.js укажите form.endpoint: "/send.php".

  Токен хранится только здесь, на сервере. Никогда не вставляйте его в config.js.
*/

$BOT_TOKEN = getenv('TG_BOT_TOKEN') ?: 'ВСТАВЬТЕ_ТОКЕН';
$CHAT_ID   = getenv('TG_CHAT_ID')   ?: 'ВСТАВЬТЕ_CHAT_ID';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad request']);
    exit;
}

$clean = function ($key, $max = 200) use ($data) {
    $value = isset($data[$key]) ? trim((string) $data[$key]) : '';
    return mb_substr(strip_tags($value), 0, $max);
};

$name  = $clean('name', 60);
$phone = $clean('phone', 22);
$digits = preg_replace('/\D/', '', $phone);

if ($name === '' || strlen($digits) < 10 || strlen($digits) > 15 || empty($data['consent'])) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'validation']);
    exit;
}

$lines = [
    'Новая заявка с сайта',
    'Имя: ' . $name,
    'Телефон: ' . $phone,
    'Связаться: ' . $clean('contactMethod', 20),
    'Услуга: ' . $clean('service', 100),
];
if ($clean('date') !== '')    $lines[] = 'Дата: ' . $clean('date', 10);
if ($clean('time') !== '')    $lines[] = 'Время: ' . $clean('time', 10);
if ($clean('comment') !== '') $lines[] = 'Комментарий: ' . $clean('comment', 500);

$ch = curl_init('https://api.telegram.org/bot' . $BOT_TOKEN . '/sendMessage');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => ['chat_id' => $CHAT_ID, 'text' => implode("\n", $lines)],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
]);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $status !== 200) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'telegram']);
    exit;
}

echo json_encode(['ok' => true]);
