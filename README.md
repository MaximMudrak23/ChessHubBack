# ChessHub Backend

Backend for **ChessHub** — an online chess platform where players can compete against both humans and bots.

The backend provides authentication, matchmaking, real-time gameplay, player management, administration tools, email verification, and chess engine integration.

## Tech Stack

- Node.js
- TypeScript
- Express
- MongoDB
- Mongoose
- Socket.IO
- JWT
- Nodemailer
- Docker
- Cloudinary

### Chess Engines

- Stockfish 18
- Komodo 14.1
- Dragon 1

## Requirements

Before running the project locally, install:

- Node.js
- Docker
- Git
- Git LFS

## Getting Started

### Clone the repository

```bash
git clone https://github.com/MaximMudrak23/ChessHubBack.git
cd ChessHubBack
```

### Install dependencies

```bash
npm install
```

### Create `.env`

Create a `.env` file based on `.env.example`.

### Build Docker image

```bash
docker build --platform linux/amd64 -t chesshub-backend .
```

### Run Docker container

```bash
docker run --platform linux/amd64 --rm --env-file .env -p 3000:3000 chesshub-backend
```

The server will be available at:

```
http://localhost:3000
```