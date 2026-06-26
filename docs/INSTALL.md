# glide. Installation & Setup

> A step-by-step guide to setting up glide. for local development or deploying it into production using Docker.

## 1. Getting Started (Local Development)

### 1.1 Prerequisites
You need to have **[Bun](https://bun.sh/)** installed on your machine.

### 1.2 Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/marl0nx/glidedot.git
cd glidedot

# Install dependencies for both frontend and backend
bun install
```

### 1.3 Run the Dev Servers
You can start both the frontend and the backend simultaneously using Turbo:
```bash
# From the root directory
bun run dev
```

> [!NOTE]
> - **Frontend** will be running at `http://localhost:3000`
> - **Backend API** will be running at `http://localhost:3001`

---

## 2. Docker Deployment (Production)

Deploying glide. is incredibly easy thanks to the included `docker-compose.yml`. We do not use `.env` files—all configuration is done directly via Docker Compose.

1. Open `docker-compose.yml` and insert your OIDC, DeepL, and S3 credentials into the `environment` blocks.
2. Build and start the containers in detached mode:

```bash
docker-compose up -d --build
```

### 2.1 What happens under the hood?
- **Frontend Container:** Builds a standalone Nuxt Nitro server using a multi-stage process for minimal image size.
- **Backend Container:** Runs the Fastify API natively using the lightweight `oven/bun:1-alpine` image.
- **Persistent Data:** A Docker volume (`glide_data`) is created automatically to ensure your SQLite database remains untouched between container restarts.

### 2.2 Factory Reset (Complete Wipe)

If you want to completely reset glide. to zero and delete the database, users, and all settings, you can remove the containers along with their volumes and networks:

```bash
docker-compose down -v
```

> [!WARNING]
> This action is irreversible. All your data will be permanently deleted unless backed up.
