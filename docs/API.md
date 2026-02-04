# 📡 API Reference

## Base URL

```
http://localhost:3001/api
```

## Autenticación

La mayoría de los endpoints requieren autenticación. Después del login, el servidor mantiene la sesión.

### Login

Autentica un usuario y crea una sesión.

**Endpoint**: `POST /api/login`

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response Success** (200):
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin"
}
```

**Response Error** (401):
```json
{
  "error": "Invalid credentials"
}
```

### Logout

Cierra la sesión del usuario.

**Endpoint**: `POST /api/logout`

**Response Success** (200):
```json
{
  "message": "Logged out successfully"
}
```

---

## Órdenes (Orders)

### Legacy API (`/api/orders`)

#### Obtener Todas las Órdenes

**Endpoint**: `GET /api/orders`

**Query Parameters**:
- `filter` (opcional): `active` | `all`
  - `active`: Solo órdenes no pagadas
  - `all`: Todas las órdenes

**Response Success** (200):
```json
[
  {
    "id": 1,
    "tableNumber": 5,
    "status": "Creado",
    "createdAt": "2024-02-04T05:00:00.000Z",
    "items": [
      {
        "id": 1,
        "orderId": 1,
        "name": "Pizza Margarita",
        "quantity": 2,
        "price": 150,
        "checked": 0
      }
    ],
    "total": 300,
    "originalOrderId": null,
    "isUpdated": 0
  }
]
```

#### Crear Nueva Orden

**Endpoint**: `POST /api/orders`

**Request Body**:
```json
{
  "tableNumber": 5,
  "items": [
    {
      "name": "Pizza Margarita",
      "quantity": 2,
      "price": 150
    },
    {
      "name": "Coca Cola",
      "quantity": 2,
      "price": 30
    }
  ]
}
```

**Response Success** (201):
```json
{
  "id": 1,
  "message": "Order created successfully"
}
```

**Response Error** (400):
```json
{
  "error": "Table number and items are required"
}
```

#### Actualizar Orden

**Endpoint**: `PUT /api/orders/:id`

**Request Body**:
```json
{
  "items": [
    {
      "name": "Pizza Margarita",
      "quantity": 3,
      "price": 150
    }
  ]
}
```

**Response Success** (200):
```json
{
  "message": "Order updated successfully"
}
```

**Response Error** (400):
```json
{
  "error": "Only orders in 'Creado' status can be edited"
}
```

#### Actualizar Estado de Orden

**Endpoint**: `PUT /api/orders/:id/status`

**Request Body**:
```json
{
  "status": "En Cocina"
}
```

**Estados Válidos**:
- `Creado`
- `En Cocina`
- `Listo`
- `Servido`
- `Pagado`

**Transiciones Válidas**:
- `Creado` → `En Cocina`
- `En Cocina` → `Listo`
- `Listo` → `Servido`
- `Servido` → `Pagado`

**Response Success** (200):
```json
{
  "message": "Order status updated successfully"
}
```

#### Eliminar Orden

**Endpoint**: `DELETE /api/orders/:id`

**Response Success** (200):
```json
{
  "message": "Order deleted successfully"
}
```

#### Marcar Ítem como Completado

**Endpoint**: `PUT /api/orders/:orderId/items/:itemId/check`

**Response Success** (200):
```json
{
  "message": "Item checked successfully"
}
```

---

### Clean Architecture API (`/api/v2/orders`)

#### Obtener Órdenes

**Endpoint**: `GET /api/v2/orders`

**Query Parameters**:
- `filter` (opcional): `active` | `all`

**Response Success** (200):
```json
[
  {
    "id": 1,
    "tableNumber": 5,
    "status": "Creado",
    "items": [...],
    "total": 300,
    "createdAt": "2024-02-04T05:00:00.000Z"
  }
]
```

#### Obtener Orden por ID

**Endpoint**: `GET /api/v2/orders/:id`

**Response Success** (200):
```json
{
  "id": 1,
  "tableNumber": 5,
  "status": "Creado",
  "items": [...],
  "total": 300
}
```

**Response Error** (404):
```json
{
  "error": "Order not found"
}
```

#### Crear Orden

**Endpoint**: `POST /api/v2/orders`

**Request Body**:
```json
{
  "tableNumber": 5,
  "items": [
    {
      "name": "Pizza",
      "quantity": 2,
      "price": 150
    }
  ]
}
```

**Response Success** (201):
```json
{
  "id": 1,
  "tableNumber": 5,
  "status": "Creado",
  "items": [...],
  "total": 300
}
```

#### Actualizar Ítems de Orden

**Endpoint**: `PUT /api/v2/orders/:id`

**Request Body**:
```json
{
  "items": [
    {
      "name": "Pizza",
      "quantity": 3,
      "price": 150
    }
  ]
}
```

**Response Success** (200):
```json
{
  "id": 1,
  "tableNumber": 5,
  "status": "Creado",
  "items": [...],
  "total": 450
}
```

#### Actualizar Estado

**Endpoint**: `PUT /api/v2/orders/:id/status`

**Request Body**:
```json
{
  "status": "En Cocina"
}
```

**Response Success** (200):
```json
{
  "id": 1,
  "status": "En Cocina",
  ...
}
```

---

## Menú (Menu)

### Obtener Menú Completo

**Endpoint**: `GET /api/menu`

**Response Success** (200):
```json
[
  {
    "id": 1,
    "name": "Pizza Margarita",
    "price": 150,
    "category": "Comida",
    "image": "/uploads/pizza.jpg"
  }
]
```

### Crear Ítem del Menú

**Endpoint**: `POST /api/menu`

**Request Body**:
```json
{
  "name": "Pizza Margarita",
  "price": 150,
  "category": "Comida",
  "image": "/uploads/pizza.jpg"
}
```

**Response Success** (201):
```json
{
  "id": 1,
  "message": "Menu item created successfully"
}
```

### Actualizar Ítem del Menú

**Endpoint**: `PUT /api/menu/:id`

**Request Body**:
```json
{
  "name": "Pizza Napolitana",
  "price": 160,
  "category": "Comida",
  "image": "/uploads/pizza-napolitana.jpg"
}
```

**Response Success** (200):
```json
{
  "message": "Menu item updated successfully"
}
```

### Eliminar Ítem del Menú

**Endpoint**: `DELETE /api/menu/:id`

**Response Success** (200):
```json
{
  "message": "Menu item deleted successfully"
}
```

---

## Usuarios (Users)

### Obtener Todos los Usuarios

**Endpoint**: `GET /api/users`

**Response Success** (200):
```json
[
  {
    "id": 1,
    "username": "admin",
    "role": "admin"
  },
  {
    "id": 2,
    "username": "mesero",
    "role": "waiter"
  }
]
```

### Crear Usuario

**Endpoint**: `POST /api/users`

**Request Body**:
```json
{
  "username": "nuevo_mesero",
  "password": "password123",
  "role": "waiter"
}
```

**Roles Válidos**:
- `admin` - Administrador
- `waiter` - Mesero
- `cook` - Cocinero

**Response Success** (201):
```json
{
  "id": 3,
  "message": "User created successfully"
}
```

**Response Error** (400):
```json
{
  "error": "Username already exists"
}
```

### Actualizar Usuario

**Endpoint**: `PUT /api/users/:id`

**Request Body**:
```json
{
  "role": "cook"
}
```

**Response Success** (200):
```json
{
  "message": "User updated successfully"
}
```

### Eliminar Usuario

**Endpoint**: `DELETE /api/users/:id`

**Response Success** (200):
```json
{
  "message": "User deleted successfully"
}
```

**Response Error** (400):
```json
{
  "error": "Cannot delete the only admin user"
}
```

---

## Configuración (Settings)

### Obtener Configuración

**Endpoint**: `GET /api/settings`

**Response Success** (200):
```json
{
  "restaurantName": "Mi Restaurante",
  "logo": "/uploads/logo.png"
}
```

### Actualizar Configuración

**Endpoint**: `PUT /api/settings`

**Request Body**:
```json
{
  "restaurantName": "Nuevo Nombre",
  "logo": "/uploads/nuevo-logo.png"
}
```

**Response Success** (200):
```json
{
  "message": "Settings updated successfully"
}
```

---

## Upload de Archivos

### Subir Imagen

**Endpoint**: `POST /api/upload`

**Request**: `multipart/form-data`

**Form Data**:
- `file`: Archivo de imagen (PNG, JPG, JPEG)

**Response Success** (200):
```json
{
  "url": "/uploads/logo-1234567890.png"
}
```

**Response Error** (400):
```json
{
  "error": "No file uploaded"
}
```

---

## Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Petición exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

---

## Manejo de Errores

Todos los errores siguen el formato:

```json
{
  "error": "Mensaje descriptivo del error"
}
```

### Errores Comunes

#### ValidationError (400)
```json
{
  "error": "Table number is required"
}
```

#### NotFoundError (404)
```json
{
  "error": "Order not found"
}
```

#### UnauthorizedError (401)
```json
{
  "error": "Invalid credentials"
}
```

#### DatabaseError (500)
```json
{
  "error": "Database operation failed"
}
```

---

## Rate Limiting

Actualmente no hay rate limiting implementado. Se recomienda implementar para producción.

---

## Ejemplos con cURL

### Login
```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Crear Orden
```bash
curl -X POST http://localhost:3001/api/v2/orders \
  -H "Content-Type: application/json" \
  -d '{
    "tableNumber": 5,
    "items": [
      {"name": "Pizza", "quantity": 2, "price": 150}
    ]
  }'
```

### Obtener Órdenes Activas
```bash
curl http://localhost:3001/api/v2/orders?filter=active
```

### Actualizar Estado
```bash
curl -X PUT http://localhost:3001/api/v2/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "En Cocina"}'
```

---

## Notas Adicionales

- Todas las fechas están en formato ISO 8601
- Los precios están en la moneda local (sin decimales)
- Las imágenes se sirven desde `/uploads/`
- La API mantiene compatibilidad con versiones legacy en `/api/*`
