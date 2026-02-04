# 🍽️ Sistema de Gestión de Restaurante

Sistema completo de gestión de pedidos para restaurantes con interfaz web moderna, desarrollado con React y Node.js.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Arquitectura](#-arquitectura)
- [API](#-api)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

## ✨ Características

### Para Meseros
- ✅ Crear nuevas órdenes con selección de mesa e ítems del menú
- ✅ Visualizar órdenes activas en tiempo real
- ✅ Actualizar estado de órdenes (Creado → En Cocina → Listo → Servido → Pagado)
- ✅ Editar ítems de órdenes en estado "Creado"
- ✅ Filtrar órdenes por estado (Activas/Todas)
- ✅ Interfaz responsiva optimizada para tablets

### Para Cocineros
- ✅ Ver órdenes en cocina con checklist de ítems
- ✅ Marcar ítems individuales como completados
- ✅ Actualizar estado de órdenes a "Listo"
- ✅ Vista FIFO (First In, First Out) de órdenes

### Para Administradores
- ✅ Gestión completa del menú (crear, editar, eliminar ítems)
- ✅ Subida de imágenes para ítems del menú
- ✅ Gestión de usuarios (crear, editar roles, eliminar)
- ✅ Configuración del restaurante (nombre, logo)
- ✅ Panel de administración completo

### Características Técnicas
- 🔄 Actualización automática cada 5 segundos
- 📱 Diseño responsive (móvil, tablet, desktop)
- 🎨 Interfaz moderna con glassmorphism
- 🔐 Sistema de autenticación por roles
- 💾 Base de datos SQLite
- 🏗️ Arquitectura limpia (Clean Architecture)

## 🛠️ Tecnologías

### Frontend
- **React** 18.3.1 - Biblioteca de UI
- **Vite** 7.3.1 - Build tool y dev server
- **CSS3** - Estilos personalizados (sin frameworks)

### Backend
- **Node.js** - Runtime de JavaScript
- **Express** 4.21.2 - Framework web
- **SQLite3** 5.1.7 - Base de datos
- **bcryptjs** 2.4.3 - Encriptación de contraseñas
- **Multer** 1.4.5-lts.1 - Manejo de archivos

### Herramientas de Desarrollo
- **ESLint** - Linting de código
- **PostCSS** - Procesamiento de CSS

## 📦 Requisitos Previos

- **Node.js** >= 14.0.0
- **npm** >= 6.0.0

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd restaurant
```

### 2. Instalar Dependencias

```bash
# Instalar dependencias del servidor
npm install

# Instalar dependencias del cliente
cd client
npm install
cd ..
```

### 3. Configurar Variables de Entorno (Opcional)

```bash
# Crear archivo .env en la raíz del proyecto
cp .env.example .env
```

Editar `.env` con tus configuraciones:

```env
PORT=3001
NODE_ENV=production
```

### 4. Construir el Frontend

```bash
cd client
npm run build
cd ..
```

## 💻 Uso

### Modo Desarrollo

#### Opción 1: Servidor y Cliente por Separado

```bash
# Terminal 1 - Servidor
npm run server

# Terminal 2 - Cliente
npm run client
```

#### Opción 2: Script de Reinicio Automático (Windows)

```bash
.\restart.bat
```

### Modo Producción

```bash
# Construir frontend
cd client
npm run build
cd ..

# Iniciar servidor
npm run server
```

El servidor estará disponible en:
- **Local**: http://localhost:3001
- **Red**: http://192.168.1.81:3001

### Credenciales por Defecto

#### Administrador
- **Usuario**: `admin`
- **Contraseña**: `admin123`

#### Mesero
- **Usuario**: `mesero`
- **Contraseña**: `mesero123`

#### Cocinero
- **Usuario**: `cocinero`
- **Contraseña**: `cocinero123`

## 🏗️ Arquitectura

El proyecto sigue los principios de **Clean Architecture** con separación clara de responsabilidades:

```
restaurant/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── *.jsx          # Páginas principales
│   │   └── *.css          # Estilos
│   └── dist/              # Build de producción
│
├── server/                # Backend Node.js
│   ├── src/              # Clean Architecture
│   │   ├── domain/       # Entidades y lógica de negocio
│   │   ├── use-cases/    # Casos de uso
│   │   ├── infrastructure/ # Repositorios e implementaciones
│   │   ├── interface-adapters/ # Controladores y DTOs
│   │   └── frameworks/   # Express, DI, rutas
│   ├── index.js          # Servidor legacy
│   ├── index-clean.js    # Servidor Clean Architecture
│   ├── routes.js         # Rutas legacy
│   └── db.js             # Base de datos legacy
│
├── uploads/              # Archivos subidos (imágenes)
└── restaurant.db         # Base de datos SQLite
```

### Capas de Clean Architecture

1. **Domain** - Entidades y reglas de negocio
2. **Use Cases** - Lógica de aplicación
3. **Infrastructure** - Implementaciones de repositorios
4. **Interface Adapters** - Controladores HTTP
5. **Frameworks** - Express, rutas, DI

Para más detalles, ver [Documentación de Arquitectura](./docs/ARCHITECTURE.md)

## 📡 API

### Endpoints Principales

#### Autenticación
```
POST /api/login
```

#### Órdenes (Legacy)
```
GET    /api/orders         # Obtener órdenes
POST   /api/orders         # Crear orden
PUT    /api/orders/:id     # Actualizar orden
DELETE /api/orders/:id     # Eliminar orden
```

#### Órdenes (Clean Architecture)
```
GET    /api/v2/orders           # Obtener órdenes
POST   /api/v2/orders           # Crear orden
GET    /api/v2/orders/:id       # Obtener orden por ID
PUT    /api/v2/orders/:id       # Actualizar ítems
PUT    /api/v2/orders/:id/status # Actualizar estado
```

#### Menú
```
GET    /api/menu           # Obtener menú
POST   /api/menu           # Crear ítem
PUT    /api/menu/:id       # Actualizar ítem
DELETE /api/menu/:id       # Eliminar ítem
```

#### Usuarios
```
GET    /api/users          # Obtener usuarios
POST   /api/users          # Crear usuario
PUT    /api/users/:id      # Actualizar usuario
DELETE /api/users/:id      # Eliminar usuario
```

Para documentación completa de la API, ver [API Reference](./docs/API.md)

## 📱 Capturas de Pantalla

### Dashboard de Órdenes
Vista principal con columnas por estado de orden.

### Panel de Administración
Gestión de menú, usuarios y configuración.

### Modal de Nueva Orden
Interfaz intuitiva para crear órdenes.

## 🔄 Estado del Proyecto

### Completado ✅
- Sistema de órdenes completo
- Gestión de menú
- Gestión de usuarios
- Autenticación por roles
- Clean Architecture (módulo de órdenes)
- Interfaz responsive
- Diseño monocromático con etiquetas de colores

### En Progreso 🚧
- Migración completa a Clean Architecture
- Tests unitarios e integración
- Documentación de API con Swagger

### Planificado 📋
- Reportes y estadísticas
- Notificaciones en tiempo real (WebSockets)
- Impresión de tickets
- Modo offline

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autores

- **Equipo de Desarrollo** - *Trabajo Inicial*

## 🙏 Agradecimientos

- Comunidad de React
- Comunidad de Node.js
- Todos los contribuidores

## 📞 Soporte

Para soporte, por favor abre un issue en el repositorio de GitHub.

---

**Hecho con ❤️ para mejorar la gestión de restaurantes**
