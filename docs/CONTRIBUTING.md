# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir al proyecto! Esta guía te ayudará a empezar.

## Código de Conducta

### Nuestro Compromiso

Nos comprometemos a hacer de este proyecto una experiencia libre de acoso para todos, independientemente de:
- Edad
- Tamaño corporal
- Discapacidad
- Etnia
- Identidad y expresión de género
- Nivel de experiencia
- Nacionalidad
- Apariencia personal
- Raza
- Religión
- Identidad y orientación sexual

### Comportamiento Esperado

- Usar lenguaje acogedor e inclusivo
- Respetar diferentes puntos de vista y experiencias
- Aceptar críticas constructivas con gracia
- Enfocarse en lo que es mejor para la comunidad
- Mostrar empatía hacia otros miembros

## Cómo Contribuir

### Reportar Bugs

Si encuentras un bug, por favor abre un issue con:

**Título**: Descripción breve del problema

**Descripción**:
- Pasos para reproducir
- Comportamiento esperado
- Comportamiento actual
- Screenshots (si aplica)
- Información del entorno (OS, Node version, etc.)

**Ejemplo**:
```markdown
## Descripción
Las órdenes no se actualizan automáticamente en el dashboard

## Pasos para Reproducir
1. Iniciar sesión como mesero
2. Crear una nueva orden
3. Esperar 5 segundos
4. La orden no aparece sin refrescar manualmente

## Comportamiento Esperado
La orden debería aparecer automáticamente después de 5 segundos

## Entorno
- OS: Windows 11
- Node: v18.17.0
- Browser: Chrome 120
```

### Sugerir Mejoras

Para sugerir nuevas características:

1. Verifica que no exista un issue similar
2. Abre un nuevo issue con el tag `enhancement`
3. Describe claramente:
   - El problema que resuelve
   - La solución propuesta
   - Alternativas consideradas
   - Impacto en usuarios existentes

### Pull Requests

#### Proceso

1. **Fork el repositorio**

```bash
git clone https://github.com/tu-usuario/restaurant.git
cd restaurant
```

2. **Crear una rama**

```bash
git checkout -b feature/nombre-descriptivo
```

Convenciones de nombres de ramas:
- `feature/` - Nueva funcionalidad
- `fix/` - Corrección de bugs
- `docs/` - Cambios en documentación
- `refactor/` - Refactorización de código
- `test/` - Agregar o mejorar tests

3. **Hacer cambios**

Sigue las guías de estilo del proyecto (ver abajo)

4. **Commit**

```bash
git add .
git commit -m "feat: agregar filtro por categoría en menú"
```

Convenciones de commits (Conventional Commits):
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Formato, punto y coma faltantes, etc.
- `refactor:` - Refactorización de código
- `test:` - Agregar tests
- `chore:` - Actualizar dependencias, etc.

5. **Push**

```bash
git push origin feature/nombre-descriptivo
```

6. **Abrir Pull Request**

En GitHub, abre un PR con:
- Título descriptivo
- Descripción detallada de cambios
- Referencias a issues relacionados
- Screenshots (si aplica)

#### Checklist para PR

Antes de enviar tu PR, verifica:

- [ ] El código sigue las guías de estilo
- [ ] Los tests pasan
- [ ] Se agregaron tests para nueva funcionalidad
- [ ] La documentación está actualizada
- [ ] Los commits siguen Conventional Commits
- [ ] No hay conflictos con la rama main

## Guías de Estilo

### JavaScript/JSX

#### General

```javascript
// ✅ Bueno
const createOrder = async (tableNumber, items) => {
  if (!tableNumber || !items) {
    throw new ValidationError('Missing required fields');
  }
  
  return await orderRepository.save(order);
};

// ❌ Malo
function createOrder(tableNumber,items){
  if(!tableNumber||!items)throw new Error('Missing required fields')
  return orderRepository.save(order)
}
```

#### Nombres

- **Variables y funciones**: camelCase
- **Clases**: PascalCase
- **Constantes**: UPPER_SNAKE_CASE
- **Archivos**: PascalCase para componentes, camelCase para utilidades

```javascript
// Variables y funciones
const orderTotal = calculateTotal(items);
const handleSubmit = () => {};

// Clases
class OrderRepository {}
class CreateOrder {}

// Constantes
const MAX_ITEMS_PER_ORDER = 50;
const API_BASE_URL = '/api';

// Archivos
Dashboard.jsx
OrderCard.jsx
orderService.js
utils.js
```

#### Componentes React

```javascript
// ✅ Bueno - Componente funcional con hooks
import { useState, useEffect } from 'react';

function OrderCard({ order, onStatusChange }) {
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Effect logic
  }, [order]);
  
  const handleClick = async () => {
    setIsLoading(true);
    await onStatusChange(order.id);
    setIsLoading(false);
  };
  
  return (
    <div className="order-card">
      {/* JSX */}
    </div>
  );
}

export default OrderCard;
```

#### Clean Architecture

Al agregar nueva funcionalidad, sigue las capas:

```javascript
// 1. Domain Entity
class Order {
  constructor({ id, tableNumber, items, status }) {
    this.id = id;
    this.tableNumber = tableNumber;
    this.items = items;
    this.status = new OrderStatus(status);
  }
  
  canBeEdited() {
    return this.status.isCreated();
  }
}

// 2. Use Case
class CreateOrder {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }
  
  async execute(input) {
    const order = new Order(input);
    return await this.orderRepository.save(order);
  }
}

// 3. Repository Implementation
class OrderRepository extends IOrderRepository {
  async save(order) {
    // SQLite implementation
  }
}

// 4. Controller
class OrderController {
  async createOrder(req, res, next) {
    try {
      const order = await this.createOrderUseCase.execute(req.body);
      res.status(201).json(order.toJSON());
    } catch (error) {
      next(error);
    }
  }
}
```

### CSS

#### Convenciones

```css
/* ✅ Bueno - BEM-like naming */
.order-card {
  padding: var(--spacing-md);
}

.order-card__header {
  display: flex;
  justify-content: space-between;
}

.order-card__title {
  font-size: 1.2rem;
  font-weight: 700;
}

.order-card--active {
  border-color: var(--primary);
}

/* ❌ Malo */
.card {
  padding: 10px;
}

.card div {
  display: flex;
}
```

#### Variables CSS

Usar variables CSS definidas en `:root`:

```css
/* ✅ Bueno */
.button {
  background: var(--primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}

/* ❌ Malo */
.button {
  background: #bfbfbf;
  padding: 1rem;
  border-radius: 12px;
}
```

### Documentación

#### JSDoc para Funciones

```javascript
/**
 * Creates a new order in the system
 * @param {number} tableNumber - The table number
 * @param {Array<OrderItem>} items - Array of order items
 * @returns {Promise<Order>} The created order
 * @throws {ValidationError} If input is invalid
 */
async function createOrder(tableNumber, items) {
  // Implementation
}
```

#### Comentarios

```javascript
// ✅ Bueno - Explica el "por qué"
// Usamos setTimeout para evitar race conditions con la base de datos
setTimeout(() => fetchOrders(), 100);

// ❌ Malo - Explica el "qué" (obvio del código)
// Incrementa el contador en 1
counter++;
```

## Testing

### Escribir Tests

```javascript
// tests/domain/Order.test.js
describe('Order', () => {
  describe('canBeEdited', () => {
    it('should return true when status is Creado', () => {
      const order = new Order({ status: 'Creado' });
      expect(order.canBeEdited()).toBe(true);
    });
    
    it('should return false when status is En Cocina', () => {
      const order = new Order({ status: 'En Cocina' });
      expect(order.canBeEdited()).toBe(false);
    });
  });
});
```

### Ejecutar Tests

```bash
npm test
```

## Estructura del Proyecto

Al agregar nuevos archivos, sigue la estructura existente:

```
server/src/
├── domain/
│   ├── entities/
│   │   └── NewEntity.js
│   ├── value-objects/
│   │   └── NewValueObject.js
│   └── repositories/
│       └── INewRepository.js
├── use-cases/
│   └── new-feature/
│       ├── CreateNew.js
│       ├── GetNew.js
│       └── index.js
├── infrastructure/
│   └── database/
│       └── repositories/
│           └── NewRepository.js
├── interface-adapters/
│   └── controllers/
│       └── NewController.js
└── frameworks/
    └── express/
        └── routes/
            └── newRoutes.js
```

## Revisión de Código

### Qué Buscar

- ✅ Código limpio y legible
- ✅ Nombres descriptivos
- ✅ Funciones pequeñas y enfocadas
- ✅ Manejo apropiado de errores
- ✅ Tests adecuados
- ✅ Documentación actualizada
- ✅ Sin código comentado
- ✅ Sin console.logs en producción

### Dar Feedback

- Sea constructivo y respetuoso
- Explique el "por qué" de sus sugerencias
- Ofrezca alternativas
- Reconozca el buen trabajo

## Preguntas Frecuentes

### ¿Puedo trabajar en un issue asignado a otra persona?

No, espera a que se libere o pregunta primero.

### ¿Cuánto tiempo toma revisar un PR?

Generalmente 2-3 días hábiles.

### ¿Qué hago si mi PR tiene conflictos?

```bash
git checkout main
git pull origin main
git checkout tu-rama
git rebase main
# Resolver conflictos
git push --force-with-lease
```

### ¿Puedo hacer múltiples cambios en un PR?

Preferiblemente no. Un PR = Una funcionalidad/fix.

## Recursos

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [React Best Practices](https://react.dev/learn)
- [JavaScript Style Guide](https://github.com/airbnb/javascript)

## Contacto

- GitHub Issues: Para bugs y features
- Discussions: Para preguntas generales

---

¡Gracias por contribuir! 🎉
