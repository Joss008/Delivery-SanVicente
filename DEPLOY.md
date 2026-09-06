# Despliegue en Render

Este proyecto está listo para subirse a [Render](https://render.com) usando
disco persistente para SQLite. Sigue los pasos a continuación.

## 1. Preparar el repositorio

Sube el código de `PROJECTO DELIVERY/` a un repositorio de GitHub. **No
commitees `.env`** — está en `.gitignore`.

Antes del primer push, regenera la contraseña del admin seed (o cámbiala al
ingresar por primera vez) y considera rotar el `TELEGRAM_BOT_TOKEN` que estaba
en el `.env` viejo.

## 2. Crear el servicio en Render

Tienes dos caminos:

### Opción A — Blueprint (recomendado)

1. Entra a [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints).
2. Click **New Blueprint Instance** y conecta el repo de GitHub.
3. Render detectará `render.yaml` y creará el servicio web + disco persistente.
4. Después de aplicar el blueprint, ve al servicio y en **Environment**
   configura `TELEGRAM_BOT_TOKEN` con tu token real (marca "Secret").

### Opción B — Manual

1. **New Web Service** → conecta el repo.
2. Configuración:
   - **Runtime**: Node
   - **Region**: Oregon (o el más cercano)
   - **Branch**: `main`
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter (necesario para el disco persistente)
3. **Environment**:
   - `NODE_VERSION` = `22`
   - `NODE_OPTIONS` = `--experimental-sqlite`
   - `DATA_DIR` = `/var/data`
   - `TELEGRAM_BOT_TOKEN` = *(tu token, secret)*
4. **Disks** → **Add Disk**:
   - Name: `reparto-data`
   - Mount path: `/var/data`
   - Size: 1 GB
5. **Health Check Path**: `/login`

## 3. Verificar el deploy

Después del primer deploy, abre la URL pública. Deberías ver la pantalla de
login. Las credenciales iniciales se crean automáticamente con el seed:

- Admin: `admin@reparto.local` / `admin123`
- Empresa demo: `casa@reparto.local` / `demo1234`

**Importante**: cambia la contraseña del admin en cuanto ingreses por primera
vez (pendiente de UI — de momento hazlo directo en la BD si tienes acceso
shell al servicio).

## 4. Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | Opcional |
| `DATA_DIR` | Carpeta del archivo SQLite (default `./data`) | Opcional |
| `PORT` | Lo asigna Render automáticamente | Sí |
| `NODE_OPTIONS` | `--experimental-sqlite` para `node:sqlite` | Sí |
| `NODE_VERSION` | `22` (Render usa `.node-version`) | Sí |

## 5. PWA del repartidor (PWA-Delivery)

La PWA móvil **no** se despliega aquí: es una app cliente que consume la API
del backend. Para producción tienes dos opciones:

1. **Build estático**: en `PWA-Delivery` corre `npm run build` y sube `.next/`
   o exporta a estático, luego despliega en Render como **Static Site** o en
   Vercel/Netlify.
2. **Vercel** es la opción más simple para Next.js PWA. Solo importa el repo
   y configura `NEXT_PUBLIC_API_BASE_URL` apuntando a la URL del backend en
   Render.

## 6. Por qué no migrar a PostgreSQL (todavía)

SQLite con disco persistente funciona para prototipos y operaciones pequeñas.
Si el sistema crece (cientos de pedidos/hora, alta concurrencia de escritura,
réplicas), conviene migrar a PostgreSQL:

- Render ofrece PostgreSQL gratis por 90 días y después desde $7/mes.
- Reemplazar `node:sqlite` por `pg` (o Prisma/Drizzle) implica tocar
  `lib/db.ts` y todas las queries.

Cuando llegue el momento, `lib/db.ts` es el único punto de contacto con la
base de datos, así que la migración es contenida.
