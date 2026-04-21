# Publicar y usar imágenes en GitHub Container Registry (GHCR)

Esta guía aplica a este monorepo (`api` + `web` + `postgres` + `redis`) y al enfoque container-first.

## 1) Qué se agregó en el proyecto

- Workflow de publicación: [.github/workflows/publish-ghcr.yml](../.github/workflows/publish-ghcr.yml)
- Compose para correr imágenes desde GHCR: [infra/docker-compose.ghcr.yml](../infra/docker-compose.ghcr.yml)

## 2) Requisitos en GitHub

1. El repositorio debe estar en GitHub.
2. En `Settings > Actions > General`, permitir workflows.
3. En `Settings > Packages`, verificar que se permita publicar paquetes/imágenes.

No necesitas token personal para el workflow porque se usa `secrets.GITHUB_TOKEN` con permisos `packages: write`.

## 3) Cómo publicar imágenes

### Opción A: Automático (recomendado)

Se publica automáticamente cuando haces `push` a `demo` o cuando creas tags `v*`.

Ejemplos:

- `git push origin demo`
- `git tag v0.1.0 && git push origin v0.1.0`

Tags que genera el workflow:

- `latest` (solo rama por defecto)
- nombre de rama
- `sha-<commit>`
- tag git (`v0.1.0`, etc.)

Imágenes resultantes:

- `ghcr.io/<owner>/fidu-api:<tag>`
- `ghcr.io/<owner>/fidu-web:<tag>`

### Opción B: Manual

1. Ve a `Actions` en GitHub.
2. Ejecuta `Publish Docker images to GHCR` con `Run workflow`.

## 4) Dónde ver las imágenes

Después de la primera publicación:

- Perfil u organización en GitHub > `Packages`
- Debes ver `fidu-api` y `fidu-web`

## 5) Desplegar usando solo imágenes (sin build local)

Usa [infra/docker-compose.ghcr.yml](../infra/docker-compose.ghcr.yml).

### 5.1 Crear archivo de entorno de despliegue

Ejemplo `.env.ghcr`:

```bash
GHCR_OWNER=tu-org-o-usuario
IMAGE_TAG=latest
POSTGRES_PASSWORD=tu-password-seguro
NEXTAUTH_SECRET=tu-secret-muy-largo
```

### 5.2 Login en GHCR desde el servidor

Si el paquete es privado, en el servidor debes autenticar Docker:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u TU_USUARIO --password-stdin
```

`GHCR_TOKEN` debe tener al menos `read:packages`.

### 5.3 Levantar servicios

```bash
docker compose --env-file .env.ghcr -f infra/docker-compose.ghcr.yml pull
docker compose --env-file .env.ghcr -f infra/docker-compose.ghcr.yml up -d
```

## 6) Rollback rápido

Cambia `IMAGE_TAG` a una versión previa y vuelve a levantar:

```bash
IMAGE_TAG=v0.1.0

docker compose --env-file .env.ghcr -f infra/docker-compose.ghcr.yml pull
docker compose --env-file .env.ghcr -f infra/docker-compose.ghcr.yml up -d
```

## 7) Notas importantes

1. Este flujo publica desde `api.Dockerfile.dev` y `web.Dockerfile.dev`.
2. Para producción estricta conviene crear Dockerfiles `prod` (sin modo watch/dev).
3. Si usas paquetes privados GHCR en un servidor externo, asegúrate de hacer `docker login` antes del `pull`.
