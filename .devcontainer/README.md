# Dev Container - Guía de uso en VS Code

Esta guía explica cómo activar y usar el entorno de desarrollo con Dev Containers en este proyecto desde VS Code.

## 1. Qué hace este entorno

Este proyecto tiene dos capas distintas:

1. **Dev Container de VS Code**
   - Archivo: `.devcontainer/devcontainer.json`
   - Compose: `.devcontainer/docker-compose.yml`
   - Sirve para abrir VS Code dentro de un contenedor con terminal, extensiones y acceso a Docker.

2. **Servicios de la aplicación**
   - Archivo: `infra/docker-compose.yml`
   - Servicios: `postgres`, `redis`, `api`, `web`
   - Sirven para ejecutar la plataforma localmente.

> Importante: abrir el proyecto en un Dev Container **no levanta automáticamente** `api`, `web`, `postgres` y `redis`. Esos servicios se levantan aparte con Docker Compose.

---

## 2. Requisitos previos

Antes de empezar necesitas:

- **VS Code** instalado
- Extensión **Dev Containers** instalada en VS Code
- **Docker Desktop** funcionando en macOS
- El repositorio abierto en VS Code

Verificación rápida:

1. Abre Docker Desktop y confirma que está corriendo.
2. Abre VS Code y confirma que la extensión **Dev Containers** está instalada.
3. Abre este repositorio en VS Code.

---

## 3. Opción recomendada: Reopen in Container

Esta es la forma normal de entrar al entorno.

### Paso a paso

1. Abre el repositorio en VS Code.
2. Presiona `Cmd + Shift + P`.
3. Ejecuta el comando:
   - **Dev Containers: Reopen in Container**
4. Espera a que VS Code:
   - construya el contenedor de desarrollo
   - instale el entorno base
   - abra una nueva ventana conectada al contenedor

### Cómo saber si ya estás dentro del Dev Container

Tienes varias formas:

- En la esquina inferior izquierda aparece el indicador de Dev Container.
- En la terminal verás una ruta como `/workspaces/Piloto-FiduConciliation`.
- Si ejecutas `pwd`, el resultado debe apuntar a `/workspaces/...`.

---

## 4. Opción cuando cambias la configuración: Rebuild and Reopen

Usa esta opción si modificaste alguno de estos archivos:

- `.devcontainer/devcontainer.json`
- `.devcontainer/docker-compose.yml`
- `.devcontainer/Dockerfile`

### Paso a paso

1. Presiona `Cmd + Shift + P`.
2. Ejecuta:
   - **Dev Containers: Rebuild and Reopen in Container**
3. Espera a que se reconstruya la imagen del entorno.

Usa esta opción si:

- cambiaste extensiones del contenedor
- cambiaste la imagen base
- cambiaste mounts o configuración del entorno

---

## 5. Opción para volver a abrir el proyecto localmente

Si ya estás dentro del contenedor y quieres volver a tu entorno normal:

1. Presiona `Cmd + Shift + P`.
2. Ejecuta:
   - **Dev Containers: Reopen Folder Locally**

Esto cierra la sesión remota y vuelve a abrir la carpeta en tu macOS.

---

## 6. Opción para adjuntarte a un contenedor ya corriendo

Úsala si ya tienes un contenedor corriendo y quieres conectarte a él sin reabrir toda la carpeta.

### Paso a paso

1. Presiona `Cmd + Shift + P`.
2. Ejecuta:
   - **Dev Containers: Attach to Running Container...**
3. Selecciona el contenedor deseado.

### Cuándo sirve

- Para inspeccionar un contenedor temporalmente
- Para revisar logs o archivos
- Para depurar algo puntual

> Para desarrollo normal del repo, sigue siendo mejor **Reopen in Container**.

---

## 7. Opción container-first: clonar el repo dentro de un volumen Docker

Si quieres trabajar sin usar una carpeta local del Mac como fuente principal, VS Code también permite clonar el proyecto dentro de un volumen Docker.

### Paso a paso

1. Abre una ventana nueva de VS Code.
2. Presiona `Cmd + Shift + P`.
3. Ejecuta:
   - **Dev Containers: Clone Repository in Container Volume...**
4. Pega la URL del repositorio.
5. Selecciona la rama que quieres abrir.
6. VS Code clonará el proyecto dentro de un volumen administrado por Docker.

### Ventajas

- No dependes del código local
- Todo vive dentro de Docker
- Aíslas mejor el entorno

### Consideraciones

- Debes hacer `git commit` y `git push` desde el contenedor
- Los archivos no estarán en una carpeta normal del Finder
- Para este proyecto, esta opción es válida, pero la opción más simple sigue siendo abrir el repo local y usar `Reopen in Container`

---

## 8. Cómo levantar los servicios del proyecto desde el Dev Container

Una vez dentro del Dev Container, puedes arrancar los servicios reales de la app con el Compose de infraestructura.

### Paso a paso

1. Abre una terminal integrada dentro del Dev Container.
2. Ve a la raíz del repo si no estás allí.
3. Ejecuta:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis api web
```

### Qué levantará

- `postgres`
- `redis`
- `api`
- `web`

### Puertos esperados

- Web: `3000`
- API: `4000`
- Postgres: `5433`
- Redis: `6379`

Para detenerlos:

```bash
docker compose -f infra/docker-compose.yml down
```

---

## 9. Flujo de trabajo recomendado para este repo

### Flujo A: recomendado para la mayoría

1. Abrir el repo local en VS Code.
2. Ejecutar **Dev Containers: Reopen in Container**.
3. Dentro del contenedor, levantar servicios con:

```bash
docker compose -f infra/docker-compose.yml up -d
```

4. Desarrollar normalmente.
5. Hacer `git status`, `git add`, `git commit` y `git push`.

### Flujo B: 100% container-first

1. Abrir una ventana nueva de VS Code.
2. Ejecutar **Dev Containers: Clone Repository in Container Volume...**.
3. Clonar el repo dentro del volumen.
4. Levantar servicios con Docker Compose.
5. Trabajar y versionar todo desde el contenedor.

---

## 10. Cómo saber si tus cambios quedan en el repo

Depende del modo en que abriste el proyecto:

### Si usaste `Reopen in Container`

- Sí, los cambios quedan reflejados en tu carpeta local
- Git los detecta normalmente
- Luego debes hacer `commit` y `push` para verlos en GitHub

### Si usaste `Clone Repository in Container Volume`

- Los cambios quedan dentro del volumen Docker
- Git funciona normal dentro del contenedor
- Debes hacer `commit` y `push` desde el mismo contenedor

---

## 11. Comandos útiles dentro del Dev Container

```bash
pwd
git status
docker ps
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml logs -f api
docker compose -f infra/docker-compose.yml down
```

---

## 12. Abrir terminal en equipo 

```bash
docker exec -it <nombre-exacto> bash
```

Ejemplo:

```bash
docker exec -it pee6f284797e bash
```

---

## 13. Solución de problemas frecuentes

### A. VS Code no muestra la opción Dev Container

- Verifica que la extensión **Dev Containers** esté instalada
- Reinicia VS Code

### B. Docker no responde

- Abre Docker Desktop
- Espera a que termine de iniciar
- Intenta de nuevo

### C. El contenedor abre, pero no veo mis extensiones

Eso es normal. Las extensiones del contenedor son independientes de las locales.

Puedes:

- instalarlas manualmente en el contenedor, o
- agregarlas a `.devcontainer/devcontainer.json`

### D. `api` o `web` no levantan

Revisa logs:

```bash
docker compose -f infra/docker-compose.yml logs -f api
docker compose -f infra/docker-compose.yml logs -f web
```

### E. Quiero reconstruir todo desde cero

1. Ejecuta:

```bash
docker compose -f infra/docker-compose.yml down -v
```

2. Luego en VS Code usa:
   - **Dev Containers: Rebuild and Reopen in Container**

---

## 13. Resumen rápido

### Si quieres entrar al entorno
- **Dev Containers: Reopen in Container**

### Si cambiaste configuración del contenedor
- **Dev Containers: Rebuild and Reopen in Container**

### Si quieres volver a local
- **Dev Containers: Reopen Folder Locally**

### Si quieres conectarte a uno ya corriendo
- **Dev Containers: Attach to Running Container...**

### Si quieres trabajar sin carpeta local
- **Dev Containers: Clone Repository in Container Volume...**
