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

## Chess Engines

- Stockfish 18
- Komodo 14.1
- Dragon 1
- Reckless 0.9.0

## How to run?

Run commands from root ChessHubBack directory.
Requires a running Docker engine (for example, Docker Desktop) and a separate development MongoDB database reachable from the container.

### First time setup:

1. Create `.env` (`cp .env.example .env`) and set `MONGO_URI`, `JWT_SECRET`, and credentials required by the features you use. Never commit `.env`.
2. If engine binaries were downloaded as Git LFS pointers, run `git lfs pull`.
3. Start Docker. Create the shared network once and build the dev image:

```bash
docker network create chesshub-dev # Run once per machine (or if the network was deleted)
```

```bash
docker build --platform linux/amd64 --target builder -t chesshub-backend-dev . # First setup or after Dockerfile/dependency changes
```

**Start backend** (each development session):

```bash
docker run --rm --platform linux/amd64 \
  --name chesshub-backend --network chesshub-dev \
  --env-file .env -p 127.0.0.1:3000:3000 \
  -v "$PWD/src:/app/src:ro" \
  chesshub-backend-dev ./node_modules/.bin/ts-node-dev --respawn --transpile-only --poll src/index.ts
```

**After start**

- Browser: Open `http://localhost:3000` → expected response: `{"message":"Server works"}`.

- cURL: Run `curl http://localhost:3000` in the terminal to verify the backend is responding.

- Stop: Press `Ctrl+C` in the terminal running Docker to stop the backend.

- Auto-restart: Changes to loaded runtime modules in `src/` automatically restart the backend in development mode. Type-only files and engine binaries do not trigger a restart. Rebuild the Docker image after changing dependencies, the Dockerfile, `tsconfig.json` or files in `uploads/`. After modifying `.env`, stop the container and run the startup command again to recreate it.

**Warning:** Starting the backend can start bots and modify database records. Never point local development at the production database.

## Other
## Built image — no automatic restart

Build the production-style image (this **does not** start the backend):

```bash
docker build --platform linux/amd64 -t chesshub-backend .
```

Then run it locally (stop the dev container first):

```bash
docker run --rm --platform linux/amd64 \
  --name chesshub-backend --network chesshub-dev \
  --env-file .env -p 127.0.0.1:3000:3000 \
  chesshub-backend
```

After code changes, rebuild the image and start a new container. Actual deployment also needs hosting, HTTPS and production environment configuration.

## Checks

`docker build` validates that the image builds; **it does not test gameplay**. `npm test` is currently a placeholder. Check authentication, matchmaking, bot moves and game completion manually against the development database.