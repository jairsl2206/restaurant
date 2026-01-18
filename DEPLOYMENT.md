# Guía de Deployment - Sistema de Órdenes de Restaurante

## 📋 Requisitos Previos

- Node.js v16 o superior
- npm v7 o superior
- Sistema operativo: Windows/Linux/macOS

## 🚀 Deployment en Producción

### 1. Preparación del Servidor

El servidor backend ya está configurado para servir tanto la API como el frontend estático.

**Archivos clave:**
- `server/index.js` - Servidor Express
- `server/db.js` - Base de datos SQLite
- `restaurant.db` - Base de datos (se crea automáticamente)

### 2. Build del Frontend

```bash
cd client
npm install
npm run build
```

Esto genera los archivos optimizados en `client/dist/`.

> **Nota sobre CSS**: Es normal ver una advertencia de PostCSS sobre `@import` durante el build. Esto no afecta la funcionalidad de la aplicación.

### 3. Configuración del Servidor

El servidor (`server/index.js`) está configurado para:
- Servir archivos estáticos desde `client/dist`
- API REST en `/api/*`
- Puerto: 3001 (configurable en `server/index.js`)
- Fallback a `index.html` para rutas del cliente (SPA)

**Importante**: El servidor debe servir los archivos estáticos **después** de las rutas de la API para evitar conflictos.

### 4. Iniciar en Producción

Desde la raíz del proyecto:

```bash
# Instalar dependencias del servidor (si no lo has hecho)
npm install

# Iniciar el servidor
npm run server
```

> **Importante**: Mantén la terminal abierta. El servidor debe seguir corriendo para que la aplicación esté disponible.

El servidor:
- Servirá el frontend en `http://localhost:3001`
- API disponible en `http://localhost:3001/api`
- Mostrará logs de cada petición HTTP para debugging

### 5. Acceso a la Aplicación

Abre tu navegador en: `http://localhost:3001`

**Usuarios por defecto:**
- Mesero: `mesero1` / `password123`
- Cocinero: `cocinero1` / `password123`
- Admin: `admin` / `admin123`

## 🔧 Configuración Avanzada

### Cambiar Puerto

Edita `server/index.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

### Base de Datos

La base de datos SQLite se almacena en `restaurant.db` en la raíz del proyecto.

**Backup:**
```bash
cp restaurant.db restaurant.db.backup
```

**Reset:**
```bash
rm restaurant.db
npm run server  # Se creará una nueva DB con datos iniciales
```

## 📱 Deployment en Red Local

Para acceder desde otros dispositivos en la misma red:

### 1. Configurar el Servidor

El servidor ya está configurado para escuchar en todas las interfaces de red (`0.0.0.0`).

### 2. Encontrar tu IP Local

**Windows:**
```bash
ipconfig
```
Busca "Dirección IPv4" en tu adaptador de red activo (ej: `192.168.1.88`)

**Linux/Mac:**
```bash
ifconfig
# o
ip addr
```

### 3. Configurar Firewall de Windows

**Opción A: Crear regla específica (Recomendado)**
```powershell
# Ejecutar PowerShell como Administrador
New-NetFirewallRule -DisplayName "Restaurant App" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Opción B: Firewall de Windows con GUI**
1. Abre "Firewall de Windows Defender con seguridad avanzada"
2. Click en "Reglas de entrada" → "Nueva regla"
3. Tipo: Puerto → TCP → Puerto específico: 3001
4. Acción: Permitir la conexión
5. Perfil: Marca todos (Dominio, Privado, Público)
6. Nombre: "Restaurant App Port 3001"

### 4. Verificar que el Servidor Escucha en Todas las Interfaces

Después de reiniciar el servidor, deberías ver:
```
🌍 Network access: http://192.168.1.88:3001
```

Verifica que está escuchando en `0.0.0.0`:
```powershell
netstat -an | findstr :3001
```
Deberías ver algo como: `TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING`

### 5. Acceder desde Otros Dispositivos

Desde cualquier dispositivo en la misma red WiFi:
- Abre el navegador
- Accede a: `http://192.168.1.88:3001`

### Troubleshooting de Red

**No puedo acceder desde otros dispositivos:**

1. **Verifica que el servidor esté escuchando en 0.0.0.0:**
   ```powershell
   netstat -an | findstr :3001
   ```
   Debe mostrar `0.0.0.0:3001` NO `127.0.0.1:3001`

2. **Prueba la conexión local primero:**
   - En el servidor: `http://localhost:3001` ✓
   - En el servidor: `http://192.168.1.88:3001` ✓
   - Si esto falla, es problema de firewall

3. **Verifica el firewall:**
   ```powershell
   # Ver reglas de firewall para el puerto 3001
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*3001*"}
   ```

4. **Desactiva temporalmente el firewall para probar:**
   - Panel de Control → Firewall de Windows → Activar o desactivar
   - Si funciona sin firewall, el problema es la regla de firewall

5. **Verifica que ambos dispositivos están en la misma red:**
   - Deben estar conectados al mismo router/WiFi
   - Verifica que no haya aislamiento de cliente AP habilitado en el router

6. **Prueba con ping:**
   ```bash
   # Desde otro dispositivo
   ping 192.168.1.88
   ```
   Si no responde, hay un problema de red más básico

**El router/modem no es necesario configurar** a menos que quieras acceder desde Internet (fuera de tu red local). Para acceso en red local, solo necesitas:
- Servidor escuchando en `0.0.0.0` ✓
- Firewall permitiendo puerto 3001 ✓
- Ambos dispositivos en la misma red ✓

## 🐛 Troubleshooting

### El frontend no carga (Cannot GET /)
**Síntomas**: Al acceder a `http://localhost:3001` ves "Cannot GET /"

**Soluciones**:
1. Verifica que `client/dist/index.html` existe:
   ```bash
   Test-Path client/dist/index.html
   ```
   Si devuelve `False`, ejecuta `cd client && npm run build`

2. Asegúrate de que el servidor esté corriendo:
   - La terminal debe mostrar: `🚀 Server running on http://localhost:3001`
   - **No cierres la terminal** - el servidor debe seguir activo

3. Verifica que no haya errores en `server/db.js`:
   - Revisa que no haya columnas duplicadas en las definiciones de tablas
   - El servidor debe mostrar "Connected to SQLite database"

4. Reinicia el servidor completamente:
   ```bash
   # Detén todos los procesos de Node
   Get-Process node | Stop-Process -Force
   
   # Inicia el servidor nuevamente
   npm run server
   ```

### Error de conexión a la API
- Verifica que el servidor esté corriendo en el puerto 3001
- Revisa la consola del navegador para errores de CORS
- Asegúrate de que las rutas de la API estén definidas **antes** del middleware de archivos estáticos

### La base de datos no se crea
- Verifica permisos de escritura en el directorio
- Revisa logs del servidor en la terminal
- Elimina `restaurant.db` y reinicia el servidor para recrearla

### El servidor se cierra inmediatamente
- Revisa errores de sintaxis en `server/index.js` o `server/db.js`
- Verifica que no haya errores en la consola al iniciar
- Asegúrate de que todas las dependencias estén instaladas: `npm install`

## 📊 Monitoreo

El servidor muestra logs en la consola:
- Conexiones a la base de datos
- Requests HTTP
- Errores

## 🔐 Seguridad

**Para producción real:**
1. Cambia las contraseñas por defecto en `server/db.js`
2. Considera usar variables de entorno para credenciales
3. Implementa HTTPS si es accesible desde internet
4. Configura un firewall apropiado

## 📝 Mantenimiento

### Actualizar la aplicación
1. Detén el servidor (Ctrl+C)
2. Haz tus cambios
3. Rebuild el frontend si modificaste archivos del cliente
4. Reinicia el servidor

### Limpiar órdenes antiguas
Actualmente no hay limpieza automática. Puedes:
- Acceder a la DB con un cliente SQLite
- Ejecutar: `DELETE FROM orders WHERE status = 'Pagado' AND created_at < date('now', '-30 days');`
