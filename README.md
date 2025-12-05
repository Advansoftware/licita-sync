# LicitaSync

Sistema de Auditoria e Sincronização de Licitações

## 🚀 Funcionalidades

- **Scraping de Dados**: Importação automática de licitações de sites
- **Auditoria de Conflitos**: Comparação entre dados do site e banco de produção
- **Edição de Dados**: Possibilidade de editar título e descrição antes de sincronizar
- **Sincronização Seletiva**: Escolha quais campos atualizar na produção
- **Autenticação**: Sistema de login seguro com JWT
- **Mapeamento Flexível**: Configure o mapeamento entre colunas do site e banco

## 🔐 Credenciais de Acesso

```
Usuário: admin
Senha: licita@2024
```
## 🛠️ Tecnologias
aa
### Backend
- NestJS
- TypeORM
- PostgreSQL (staging)
- MySQL (produção)
- JWT Authentication

### Frontend
- Next.js 14
- React
- TailwindCSS
- Axios

## 📦 Instalação e Uso

### Com Docker (Recomendado)

```bash
# Clone o repositório
git clone git@github.com:Advansoftware/licita-sync.git
cd licita-sync

# Suba os containers
docker compose up -d --build

# Acesse o sistema
# Frontend: http://localhost:5002
# Backend: http://localhost:5001
```

### Desenvolvimento Local

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

## 🌐 Deploy

O projeto está configurado com GitHub Actions para deploy automático no VPS.

**Portas em Produção:**
- Frontend: 5002
- Backend: 5001

Ao fazer push para a branch `master`, o deploy é executado automaticamente.

## 📝 Licença

© 2024 Advansoftware - Todos os direitos reservados
