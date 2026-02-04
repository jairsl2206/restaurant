# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0] - 2024-02-04

### Agregado
- Implementación de Clean Architecture para el módulo de órdenes
- Nuevos endpoints API v2 (`/api/v2/orders`)
- Dependency Injection container
- Entidades de dominio (Order, OrderItem)
- Value Objects (OrderStatus, UserRole, Money)
- Repository Pattern para persistencia
- 5 casos de uso para gestión de órdenes
- Documentación completa del proyecto
- Guía de arquitectura
- Referencia de API
- Guía de instalación
- Guía de contribución

### Cambiado
- Diseño de interfaz a paleta monocromática (grises, negros, blancos)
- Etiquetas de estado mantienen colores originales para mejor identificación
- Estructura del proyecto reorganizada para Clean Architecture
- Mejoras en manejo de errores

### Mejorado
- Separación de responsabilidades en capas
- Testabilidad del código
- Mantenibilidad del sistema
- Escalabilidad de la arquitectura

## [1.0.0] - 2024-01-15

### Agregado
- Sistema completo de gestión de órdenes
- Dashboard con columnas por estado
- Modal de creación de órdenes
- Gestión de menú (CRUD completo)
- Gestión de usuarios
- Sistema de autenticación por roles
- Panel de administración
- Configuración del restaurante
- Subida de imágenes
- Actualización automática cada 5 segundos
- Diseño responsive (móvil, tablet, desktop)
- Interfaz con glassmorphism
- Base de datos SQLite
- API REST completa

### Características por Rol

#### Meseros
- Crear nuevas órdenes
- Ver órdenes activas
- Actualizar estado de órdenes
- Editar ítems de órdenes en estado "Creado"
- Filtrar órdenes

#### Cocineros
- Ver órdenes en cocina
- Marcar ítems como completados
- Actualizar estado a "Listo"
- Vista FIFO de órdenes

#### Administradores
- Gestión completa del menú
- Gestión de usuarios
- Configuración del sistema
- Subida de logo

### Técnico
- Frontend: React 18.3.1 + Vite 7.3.1
- Backend: Node.js + Express 4.21.2
- Base de datos: SQLite3 5.1.7
- Autenticación: bcryptjs 2.4.3
- Upload de archivos: Multer 1.4.5

## [0.1.0] - 2023-12-01

### Agregado
- Configuración inicial del proyecto
- Estructura básica de directorios
- Dependencias principales
- README inicial

---

## Tipos de Cambios

- `Agregado` - Para nuevas funcionalidades
- `Cambiado` - Para cambios en funcionalidades existentes
- `Deprecado` - Para funcionalidades que serán removidas
- `Removido` - Para funcionalidades removidas
- `Corregido` - Para corrección de bugs
- `Seguridad` - Para vulnerabilidades de seguridad
- `Mejorado` - Para mejoras de rendimiento o calidad
