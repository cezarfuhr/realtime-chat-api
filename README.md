# Real-time Chat API

API completa de chat em tempo real com WebSockets, rooms privadas, histórico de mensagens e muito mais.

## 🚀 Funcionalidades

- 💬 **Chat em tempo real** - Mensagens instantâneas via WebSocket
- 🏠 **Rooms privadas** - Salas públicas, privadas e mensagens diretas
- 📎 **Upload de arquivos** - Compartilhamento de arquivos e imagens
- 🔍 **Busca de mensagens** - Pesquisa full-text em todo histórico
- 🔔 **Notificações push** - Sistema completo de notificações
- 📊 **Presença online** - Rastreamento de usuários online/offline
- 🔐 **Autenticação JWT** - Sistema seguro de autenticação
- 🎯 **Redis Pub/Sub** - Escalabilidade horizontal

## 🛠️ Tecnologias

### Backend
- Node.js + Express
- Socket.io (WebSocket)
- MongoDB (Database)
- Redis (Pub/Sub & Cache)
- JWT (Autenticação)
- Multer (Upload de arquivos)
- Winston (Logs)
- Jest (Testes)

### Frontend
- React 18
- Vite
- Socket.io Client
- Zustand (State Management)
- React Query
- React Router
- Axios
- Vitest (Testes)

## 📋 Pré-requisitos

- Docker & Docker Compose
- Node.js 20+ (para desenvolvimento local)
- npm ou yarn

## 🚀 Início Rápido

### 1. Clone o repositório

```bash
git clone <repository-url>
cd realtime-chat-api
```

### 2. Configure as variáveis de ambiente

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Inicie com Docker Compose

```bash
docker-compose up
```

A aplicação estará disponível em:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- MongoDB: localhost:27017
- Redis: localhost:6379

## 🔧 Desenvolvimento Local

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📚 API Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar novo usuário |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Obter perfil do usuário |
| PUT | `/api/auth/profile` | Atualizar perfil |
| POST | `/api/auth/push-token` | Atualizar token push |
| POST | `/api/auth/logout` | Logout |

### Rooms

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/rooms` | Criar nova room |
| GET | `/api/rooms` | Listar rooms do usuário |
| GET | `/api/rooms/:id` | Obter detalhes da room |
| PUT | `/api/rooms/:id` | Atualizar room |
| DELETE | `/api/rooms/:id` | Deletar room |
| POST | `/api/rooms/:id/members` | Adicionar membro |
| DELETE | `/api/rooms/:id/members` | Remover membro |
| POST | `/api/rooms/:id/leave` | Sair da room |

### Mensagens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/messages/:roomId` | Obter mensagens da room |
| POST | `/api/messages` | Enviar mensagem |
| POST | `/api/messages/upload` | Upload de arquivo |
| PUT | `/api/messages/:messageId` | Editar mensagem |
| DELETE | `/api/messages/:messageId` | Deletar mensagem |
| POST | `/api/messages/:messageId/read` | Marcar como lida |
| GET | `/api/messages/search` | Buscar mensagens |

### Notificações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/notifications` | Listar notificações |
| POST | `/api/notifications/:id/read` | Marcar como lida |
| POST | `/api/notifications/read-all` | Marcar todas como lidas |
| DELETE | `/api/notifications/:id` | Deletar notificação |

## 🔌 WebSocket Events

### Cliente → Servidor

- `join_room` - Entrar em uma room
- `leave_room` - Sair de uma room
- `send_message` - Enviar mensagem
- `typing_start` - Iniciar indicador de digitação
- `typing_stop` - Parar indicador de digitação
- `message_read` - Marcar mensagem como lida

### Servidor → Cliente

- `new_message` - Nova mensagem recebida
- `user_joined` - Usuário entrou na room
- `user_left` - Usuário saiu da room
- `user_typing` - Usuário digitando
- `message_read` - Mensagem foi lida
- `user_status` - Status do usuário mudou
- `notification` - Nova notificação
- `online_users` - Lista de usuários online
- `error` - Erro ocorrido

## 🧪 Testes

### Backend

```bash
cd backend

# Executar todos os testes
npm test

# Testes com coverage
npm test -- --coverage

# Testes em watch mode
npm run test:watch

# Apenas testes unitários
npm run test:unit

# Apenas testes de integração
npm run test:integration
```

### Frontend

```bash
cd frontend

# Executar todos os testes
npm test

# Testes com coverage
npm test -- --coverage

# Testes em watch mode
npm run test:watch

# Interface de testes
npm run test:ui
```

## 📁 Estrutura do Projeto

```
realtime-chat-api/
├── backend/                # Microserviço Backend
│   ├── src/
│   │   ├── config/        # Configurações
│   │   ├── controllers/   # Controladores
│   │   ├── middleware/    # Middlewares
│   │   ├── models/        # Modelos MongoDB
│   │   ├── routes/        # Rotas da API
│   │   ├── services/      # Serviços (Socket.io, etc)
│   │   ├── utils/         # Utilitários
│   │   └── index.js       # Entry point
│   └── tests/             # Testes
│       ├── unit/          # Testes unitários
│       └── integration/   # Testes de integração
│
├── frontend/              # Microserviço Frontend
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── services/      # API, Socket, Stores
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utilitários
│   │   ├── App.jsx        # Componente principal
│   │   └── main.jsx       # Entry point
│   └── tests/             # Testes
│       ├── unit/          # Testes unitários
│       └── integration/   # Testes de integração
│
└── docker-compose.yml     # Configuração Docker
```

## 🔒 Segurança

- Senhas hasheadas com bcrypt
- Autenticação JWT
- Validação de entrada com express-validator
- Helmet.js para headers de segurança
- CORS configurado
- Rate limiting (pode ser adicionado)
- Sanitização de dados

## 🚀 Deploy

### Variáveis de Ambiente de Produção

#### Backend

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://user:pass@host:27017/dbname
REDIS_HOST=redis-host
REDIS_PORT=6379
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-domain.com
```

#### Frontend

```env
VITE_API_URL=https://your-api-domain.com
VITE_WS_URL=https://your-api-domain.com
```

## 📊 Monitoramento

A API expõe um endpoint de health check:

```bash
GET /health
```

Resposta:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 🗺️ Roadmap

- [ ] Mensagens de voz
- [ ] Chamadas de vídeo
- [ ] Reações em mensagens
- [ ] Temas customizáveis
- [ ] Bot integrations
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)
- [ ] E2E encryption
