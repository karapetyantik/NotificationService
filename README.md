# NotificationService

Push-уведомления платформы **Tapik**: регистрация устройств и доставка уведомлений о новых сообщениях офлайн-пользователям.

> **Статус:** каркас. Регистрация устройств, определение «онлайн/офлайн» и маршрутизация событий полностью реализованы; сама push-доставка (`ConsolePushProvider`) — заглушка, которая только логирует, что было бы отправлено. Интеграция с реальным провайдером (FCM/APNs/Web Push) — следующий шаг, не входит в текущую реализацию.

## Роль в системе

```
ChatService ──message.sent (RMQ)──▶ NotificationService
                                            │
                              для каждого получателя, кроме отправителя:
                              есть активный сокет? (Redis) ──да──▶ пропустить (уже увидит в реалтайме)
                                            │ нет
                                            ▼
                              PushProvider.send(deviceToken, title, body)
```

## Технологии

- **NestJS 11**, гибрид: HTTP (регистрация устройств) + RabbitMQ consumer
- **PostgreSQL** через **Prisma** — таблица `DeviceToken`
- **Redis** — проверка presence (`user_sockets:{userId}`, тот же ключ, что использует ChatService)
- Path-алиасы: `@common/*`, `@modules/*`

## Возможности

- Регистрация/отвязка push-токена устройства (`ios`/`android`/`web`) с проверкой владения — один пользователь не может отписать чужое устройство.
- При каждом `message.sent` — для всех получателей, кроме отправителя, пакетно (Redis pipeline, не по одному запросу) проверяется, есть ли активный WebSocket-сокет; push шлётся только тем, у кого его нет.
- Ошибка отправки push одному получателю не блокирует рассылку остальным (изолированный try/catch на каждого получателя).

## API (`/notifications`)

Все эндпоинты требуют `JwtAuthGuard`.

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/notifications/register-device` | Зарегистрировать/обновить push-токен (`{ token, platform }`) |
| `POST` | `/notifications/unregister-device` | Отвязать своё устройство (`{ token }`) |

## Потребляемое событие: `message.sent`

Очередь `notification_events`, публикует ChatService. Валидируется через DTO (`chatId`, `senderId`, `content?`, `recipientIds[]`).

## Переменные окружения

| Переменная | Обязательна | Назначение |
|---|---|---|
| `PORT` | нет (3006) | HTTP-порт |
| `JWT_SECRET` | да | Проверка access-токенов |
| `DATABASE_URL` | да | PostgreSQL |
| `RABBITMQ_URL` | да | AMQP, очередь `notification_events` |
| `REDIS_HOST` / `REDIS_PORT` | да | Проверка presence получателей |

## Структура проекта

```
src/
├── main.ts
├── common/
│   ├── auth/     # JwtStrategy, JwtAuthGuard, AuthenticatedRequest
│   ├── prisma/    # PrismaService
│   └── redis/      # RedisService
└── modules/
    ├── devices/     # регистрация/отвязка устройств
    ├── notifications/ # message.sent consumer, dto/message-sent-event
    └── push/          # PushProvider интерфейс + ConsolePushProvider (заглушка)
```

## Запуск

```bash
npm install
npx prisma generate
npx prisma migrate deploy

npm run start:dev
npm run build && npm run start:prod
npm run test
npm run lint
```

## Как подключить реальную push-доставку

Реализовать `PushProvider` (`send(token, title, body): Promise<void>`) для нужного канала (FCM/APNs/Web Push) и заменить провайдер `ConsolePushProvider` на него в DI-контейнере (`'PUSH_PROVIDER'`). Остальная логика (фильтрация онлайн-пользователей, изоляция ошибок, DTO-валидация события) уже готова и менять не требует.

## Безопасность

- Отвязать можно только собственное устройство — сервис сверяет `userId` владельца токена с `req.user.userId` (раньше проверки не было вовсе).
- Payload события `message.sent` валидируется через `class-validator`, а не принимается как произвольный объект.
