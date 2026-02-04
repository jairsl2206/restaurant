# 🏗️ Arquitectura del Sistema

## Visión General

El sistema de gestión de restaurante está diseñado siguiendo los principios de **Clean Architecture** (Arquitectura Limpia), lo que proporciona:

- ✅ Separación clara de responsabilidades
- ✅ Independencia de frameworks
- ✅ Testabilidad
- ✅ Mantenibilidad
- ✅ Escalabilidad

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │    Admin     │  │    Login     │      │
│  │  Components  │  │  Components  │  │  Component   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
│                    HTTP Requests                             │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                    Backend (Node.js)                         │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │         Frameworks & Drivers Layer                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │ │
│  │  │ Express  │  │  Routes  │  │  Dependency      │    │ │
│  │  │  Server  │  │          │  │  Injection       │    │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘    │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │         Interface Adapters Layer                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │ │
│  │  │ Controllers  │  │  Middleware  │  │    DTOs    │  │ │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │              Use Cases Layer                           │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │ │
│  │  │ CreateOrder  │  │ GetOrders    │  │ Update...  │  │ │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │              Domain Layer (Core)                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │ │
│  │  │  Entities    │  │    Value     │  │ Repository │  │ │
│  │  │ Order, Item  │  │   Objects    │  │ Interfaces │  │ │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │         Infrastructure Layer                           │ │
│  │  ┌──────────────┐  ┌──────────────┐                   │ │
│  │  │ Repositories │  │   Database   │                   │ │
│  │  │ (SQLite)     │  │  Connection  │                   │ │
│  │  └──────────────┘  └──────────────┘                   │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  SQLite DB     │
                    │ restaurant.db  │
                    └────────────────┘
```

## Capas de la Arquitectura

### 1. Domain Layer (Núcleo del Negocio)

**Responsabilidad**: Contiene la lógica de negocio pura, independiente de cualquier framework o tecnología.

**Componentes**:

#### Entities (Entidades)
- `Order` - Representa una orden con toda su lógica de negocio
- `OrderItem` - Representa un ítem dentro de una orden
- `User` - Representa un usuario del sistema
- `MenuItem` - Representa un ítem del menú

**Ejemplo**:
```javascript
class Order {
  constructor({ id, tableNumber, items, status, createdAt }) {
    this.id = id;
    this.tableNumber = tableNumber;
    this.items = items;
    this.status = new OrderStatus(status);
    this.createdAt = createdAt;
  }

  canBeEdited() {
    return this.status.isCreated();
  }

  updateStatus(newStatus) {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new ValidationError('Invalid status transition');
    }
    this.status = new OrderStatus(newStatus);
  }

  calculateTotal() {
    return this.items.reduce((total, item) => 
      total.add(item.subtotal), new Money(0)
    );
  }
}
```

#### Value Objects (Objetos de Valor)
- `OrderStatus` - Estados válidos y transiciones de órdenes
- `UserRole` - Roles de usuario con permisos
- `Money` - Manejo seguro de valores monetarios

#### Repository Interfaces
- `IOrderRepository` - Contrato para persistencia de órdenes
- `IUserRepository` - Contrato para persistencia de usuarios
- `IMenuRepository` - Contrato para persistencia del menú

### 2. Use Cases Layer (Casos de Uso)

**Responsabilidad**: Orquesta el flujo de datos entre las entidades y coordina la lógica de aplicación.

**Casos de Uso de Órdenes**:
- `CreateOrder` - Crear nueva orden
- `GetOrders` - Obtener órdenes con filtros
- `GetOrderById` - Obtener orden específica
- `UpdateOrderItems` - Actualizar ítems de orden
- `UpdateOrderStatus` - Cambiar estado de orden

**Ejemplo**:
```javascript
class CreateOrder {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }

  async execute(input) {
    // Validar entrada
    this._validateInput(input);
    
    // Crear entidades de dominio
    const orderItems = input.items.map(item => new OrderItem(item));
    const order = new Order({
      tableNumber: input.tableNumber,
      items: orderItems,
      status: OrderStatus.CREATED
    });
    
    // Persistir a través del repositorio
    return await this.orderRepository.save(order);
  }
}
```

### 3. Infrastructure Layer (Infraestructura)

**Responsabilidad**: Implementa las interfaces definidas en el dominio usando tecnologías específicas.

**Componentes**:
- `OrderRepository` - Implementación SQLite de `IOrderRepository`
- `UserRepository` - Implementación SQLite de `IUserRepository`
- `MenuRepository` - Implementación SQLite de `IMenuRepository`
- Database connection management

**Ejemplo**:
```javascript
class OrderRepository extends IOrderRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  async save(order) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO orders (tableNumber, status, createdAt) VALUES (?, ?, ?)',
        [order.tableNumber, order.status.value, order.createdAt],
        function(err) {
          if (err) reject(new DatabaseError(err.message));
          resolve(order);
        }
      );
    });
  }
}
```

### 4. Interface Adapters Layer (Adaptadores)

**Responsabilidad**: Convierte datos entre el formato de los casos de uso y el formato externo (HTTP, UI).

**Componentes**:
- **Controllers** - Manejan requests HTTP
- **DTOs** - Data Transfer Objects
- **Middleware** - Autenticación, validación, manejo de errores

**Ejemplo**:
```javascript
class OrderController {
  constructor({ createOrderUseCase, getOrdersUseCase }) {
    this.createOrderUseCase = createOrderUseCase;
    this.getOrdersUseCase = getOrdersUseCase;
  }

  async createOrder(req, res, next) {
    try {
      const { tableNumber, items } = req.body;
      const order = await this.createOrderUseCase.execute({
        tableNumber,
        items
      });
      res.status(201).json(order.toJSON());
    } catch (error) {
      next(error);
    }
  }
}
```

### 5. Frameworks & Drivers Layer (Frameworks)

**Responsabilidad**: Configuración de frameworks y herramientas externas.

**Componentes**:
- Express app configuration
- Route definitions
- Dependency Injection container
- Static file serving

## Flujo de Datos

### Ejemplo: Crear una Orden

```
1. Usuario hace clic en "Crear Orden" (Frontend)
   ↓
2. React envía POST /api/v2/orders
   ↓
3. Express Router recibe la petición
   ↓
4. OrderController.createOrder() es invocado
   ↓
5. CreateOrder use case es ejecutado
   ↓
6. Order entity es creada con validaciones
   ↓
7. OrderRepository.save() persiste en DB
   ↓
8. Orden es retornada como JSON
   ↓
9. Frontend actualiza la UI
```

## Dependency Injection

El sistema usa un contenedor de DI para gestionar dependencias:

```javascript
class Container {
  constructor() {
    this.dependencies = new Map();
    this._setupDependencies();
  }

  _setupDependencies() {
    // Database
    this.register('database', db);

    // Repositories
    this.register('orderRepository', 
      new OrderRepository(this.resolve('database'))
    );

    // Use Cases
    this.register('createOrderUseCase', 
      new CreateOrder(this.resolve('orderRepository'))
    );

    // Controllers
    this.register('orderController', 
      new OrderController({
        createOrderUseCase: this.resolve('createOrderUseCase')
      })
    );
  }
}
```

## Patrones de Diseño Utilizados

### 1. Repository Pattern
Abstrae el acceso a datos, permitiendo cambiar la implementación sin afectar la lógica de negocio.

### 2. Dependency Injection
Invierte el control de dependencias, facilitando testing y mantenibilidad.

### 3. Value Object Pattern
Encapsula valores con validación y comportamiento específico.

### 4. Factory Pattern
Crea instancias complejas de objetos.

### 5. Strategy Pattern
Permite diferentes implementaciones de repositorios.

## Migración Gradual

El proyecto está en proceso de migración usando el **Strangler Fig Pattern**:

```
/api/*          → Legacy routes (código antiguo)
/api/v2/*       → Clean Architecture routes (código nuevo)
```

**Ventajas**:
- ✅ Sin interrupciones del servicio
- ✅ Migración incremental
- ✅ Rollback fácil si es necesario
- ✅ Testing en paralelo

## Principios SOLID

### Single Responsibility
Cada clase tiene una única responsabilidad.

### Open/Closed
Abierto para extensión, cerrado para modificación.

### Liskov Substitution
Las implementaciones pueden sustituir interfaces.

### Interface Segregation
Interfaces específicas en lugar de generales.

### Dependency Inversion
Dependencias apuntan hacia abstracciones.

## Testing Strategy

```
Unit Tests
├── Domain Layer (Entities, Value Objects)
├── Use Cases
└── Repositories (con mocks)

Integration Tests
├── API Endpoints
└── Database Operations

E2E Tests
└── User Flows completos
```

## Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Validación de entrada en todos los niveles
- ✅ Manejo centralizado de errores
- ✅ Sanitización de datos
- ✅ Control de acceso basado en roles

## Performance

- ✅ Conexión persistente a base de datos
- ✅ Índices en columnas frecuentemente consultadas
- ✅ Caché de archivos estáticos
- ✅ Compresión de assets en producción

## Escalabilidad Futura

### Horizontal Scaling
- Múltiples instancias del servidor
- Load balancer
- Session store compartido (Redis)

### Vertical Scaling
- Migración a PostgreSQL
- Optimización de queries
- Caching layer (Redis)

### Microservices
La arquitectura limpia facilita la división en microservicios:
- Order Service
- Menu Service
- User Service
- Notification Service

## Conclusión

La arquitectura limpia proporciona:
- 🎯 Código mantenible y testeable
- 🔄 Fácil migración de tecnologías
- 📈 Escalabilidad
- 🛡️ Robustez
- 👥 Colaboración efectiva del equipo
