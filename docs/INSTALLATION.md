# 🚀 Guía de Instalación

Esta guía te ayudará a configurar el sistema de gestión de restaurante en tu entorno local.

## Requisitos del Sistema

### Software Requerido

- **Node.js**: >= 14.0.0 (Recomendado: 18.x o superior)
- **npm**: >= 6.0.0 (Incluido con Node.js)
- **Git**: Para clonar el repositorio

### Verificar Instalación

```bash
node --version
npm --version
git --version
```

## Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd restaurant
```

### 2. Instalar Dependencias del Servidor

```bash
npm install
```

**Dependencias principales instaladas**:
- express
- sqlite3
- bcryptjs
- cors
- body-parser
- multer

### 3. Instalar Dependencias del Cliente

```bash
cd client
npm install
cd ..
```

**Dependencias principales instaladas**:
- react
- react-dom
- vite

### 4. Configurar Variables de Entorno (Opcional)

Crear archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Editar `.env`:

```env
# Puerto del servidor
PORT=3001

# Entorno
NODE_ENV=development

# Base de datos
DB_PATH=./restaurant.db
```

### 5. Inicializar Base de Datos

La base de datos se crea automáticamente al iniciar el servidor por primera vez.

**Tablas creadas**:
- `users` - Usuarios del sistema
- `orders` - Órdenes
- `order_items` - Ítems de órdenes
- `menu` - Menú del restaurante
- `settings` - Configuración

**Datos iniciales**:
- Usuario admin (admin/admin123)
- Usuario mesero (mesero/mesero123)
- Usuario cocinero (cocinero/cocinero123)
- Ítems de menú de ejemplo

## Modos de Ejecución

### Desarrollo

#### Opción 1: Servidor y Cliente Separados

**Terminal 1 - Servidor**:
```bash
npm run server
```

**Terminal 2 - Cliente** (en modo desarrollo):
```bash
npm run client
```

El cliente estará disponible en `http://localhost:5173` (Vite dev server)

#### Opción 2: Script de Reinicio (Windows)

```bash
.\restart.bat
```

Este script:
1. Construye el frontend
2. Inicia el servidor
3. Sirve el frontend desde el servidor

### Producción

#### 1. Construir el Frontend

```bash
cd client
npm run build
cd ..
```

Esto genera los archivos optimizados en `client/dist/`

#### 2. Iniciar el Servidor

```bash
npm run server
```

O para usar Clean Architecture:

```bash
npm run server:clean
```

El servidor servirá automáticamente los archivos estáticos del frontend.

## Acceder a la Aplicación

### URLs

- **Local**: http://localhost:3001
- **Red Local**: http://192.168.1.81:3001 (ajustar según tu IP)

### Credenciales por Defecto

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Administrador | admin | admin123 |
| Mesero | mesero | mesero123 |
| Cocinero | cocinero | cocinero123 |

## Estructura de Directorios

```
restaurant/
├── client/                 # Frontend React
│   ├── src/               # Código fuente
│   ├── public/            # Archivos públicos
│   ├── dist/              # Build de producción
│   └── package.json
│
├── server/                # Backend Node.js
│   ├── src/              # Clean Architecture
│   ├── index.js          # Servidor legacy
│   ├── index-clean.js    # Servidor Clean Architecture
│   ├── routes.js         # Rutas legacy
│   └── db.js             # Base de datos
│
├── docs/                 # Documentación
├── uploads/              # Imágenes subidas
├── restaurant.db         # Base de datos SQLite
├── package.json          # Dependencias del servidor
└── README.md
```

## Solución de Problemas

### Error: "Cannot find module"

```bash
# Reinstalar dependencias
rm -rf node_modules
npm install

cd client
rm -rf node_modules
npm install
cd ..
```

### Error: "Port 3001 already in use"

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

O cambiar el puerto en `.env`:
```env
PORT=3002
```

### Error: "Database locked"

Cerrar todas las instancias del servidor y reiniciar.

### Frontend no carga después del build

```bash
# Limpiar y reconstruir
cd client
rm -rf dist
npm run build
cd ..
```

### Imágenes no se cargan

Verificar que el directorio `uploads/` existe:

```bash
mkdir uploads
```

## Configuración Avanzada

### Cambiar Puerto del Servidor

Editar `.env`:
```env
PORT=8080
```

### Usar Base de Datos Diferente

Editar `.env`:
```env
DB_PATH=./custom-database.db
```

### Habilitar CORS para Desarrollo

El CORS ya está habilitado por defecto. Para configuración personalizada, editar `server/index.js`:

```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

## Despliegue

### Preparar para Producción

```bash
# 1. Construir frontend
cd client
npm run build
cd ..

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con configuración de producción

# 3. Iniciar servidor
npm run server
```

### Usar PM2 (Recomendado para Producción)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicación
pm2 start server/index.js --name restaurant

# Ver logs
pm2 logs restaurant

# Reiniciar
pm2 restart restaurant

# Detener
pm2 stop restaurant
```

### Docker (Opcional)

Crear `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json
COPY package*.json ./
COPY client/package*.json ./client/

# Instalar dependencias
RUN npm install
RUN cd client && npm install

# Copiar código
COPY . .

# Construir frontend
RUN cd client && npm run build

# Exponer puerto
EXPOSE 3001

# Iniciar servidor
CMD ["npm", "run", "server"]
```

Construir y ejecutar:

```bash
docker build -t restaurant-app .
docker run -p 3001:3001 restaurant-app
```

## Actualización

### Actualizar Dependencias

```bash
# Servidor
npm update

# Cliente
cd client
npm update
cd ..
```

### Migrar Base de Datos

Si hay cambios en el esquema, respaldar primero:

```bash
cp restaurant.db restaurant.db.backup
```

## Scripts Disponibles

### Servidor

```bash
npm run server        # Iniciar servidor legacy
npm run server:clean  # Iniciar servidor Clean Architecture
npm run dev           # Alias para npm run server
npm run dev:clean     # Alias para npm run server:clean
```

### Cliente

```bash
npm run client        # Iniciar dev server (desde raíz)
cd client
npm run dev          # Iniciar dev server
npm run build        # Construir para producción
npm run preview      # Preview del build
```

## Próximos Pasos

1. ✅ Cambiar contraseñas por defecto
2. ✅ Configurar nombre del restaurante
3. ✅ Subir logo personalizado
4. ✅ Agregar ítems al menú
5. ✅ Crear usuarios adicionales
6. ✅ Probar flujo completo de órdenes

## Soporte

Si encuentras problemas durante la instalación:

1. Revisa esta guía completa
2. Verifica los requisitos del sistema
3. Consulta la sección de solución de problemas
4. Abre un issue en GitHub

---

¡Listo! Tu sistema de gestión de restaurante está configurado y funcionando. 🎉
