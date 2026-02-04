const db = require('../../../db'); // Legacy database connection

// Domain
const Order = require('../../domain/entities/Order');
const OrderItem = require('../../domain/entities/OrderItem');
const OrderStatus = require('../../domain/value-objects/OrderStatus');
const UserRole = require('../../domain/value-objects/UserRole');
const Money = require('../../domain/value-objects/Money');

// Infrastructure
const OrderRepository = require('../../infrastructure/database/repositories/OrderRepository');

// Use Cases
const {
    CreateOrder,
    GetOrders,
    GetOrderById,
    UpdateOrderItems,
    UpdateOrderStatus
} = require('../../use-cases/orders');

// Controllers
const OrderController = require('../../interface-adapters/controllers/OrderController');

/**
 * Dependency Injection Container
 * Manages creation and lifecycle of dependencies
 */
class Container {
    constructor() {
        this.dependencies = new Map();
        this._setupDependencies();
    }

    _setupDependencies() {
        // Database (using legacy db for now)
        this.register('database', db.db);

        // Repositories
        this.register('orderRepository', new OrderRepository(this.resolve('database')));

        // Use Cases - Orders
        this.register('createOrderUseCase',
            new CreateOrder(this.resolve('orderRepository'))
        );
        this.register('getOrdersUseCase',
            new GetOrders(this.resolve('orderRepository'))
        );
        this.register('getOrderByIdUseCase',
            new GetOrderById(this.resolve('orderRepository'))
        );
        this.register('updateOrderItemsUseCase',
            new UpdateOrderItems(this.resolve('orderRepository'))
        );
        this.register('updateOrderStatusUseCase',
            new UpdateOrderStatus(this.resolve('orderRepository'))
        );

        // Controllers
        this.register('orderController', new OrderController({
            createOrderUseCase: this.resolve('createOrderUseCase'),
            getOrdersUseCase: this.resolve('getOrdersUseCase'),
            getOrderByIdUseCase: this.resolve('getOrderByIdUseCase'),
            updateOrderItemsUseCase: this.resolve('updateOrderItemsUseCase'),
            updateOrderStatusUseCase: this.resolve('updateOrderStatusUseCase')
        }));
    }

    register(name, dependency) {
        this.dependencies.set(name, dependency);
    }

    resolve(name) {
        if (!this.dependencies.has(name)) {
            throw new Error(`Dependency '${name}' not found in container`);
        }
        return this.dependencies.get(name);
    }

    has(name) {
        return this.dependencies.has(name);
    }
}

// Create singleton instance
const container = new Container();

module.exports = container;
