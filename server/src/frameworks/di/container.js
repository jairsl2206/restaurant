require('dotenv').config();
const DatabaseConnection = require('../../infrastructure/database/DatabaseConnection');
const logger = require('../../../logger');

// ── Infrastructure ────────────────────────────────────────────────────────────
const OrderRepository = require('../../infrastructure/database/repositories/OrderRepository');
const UserRepository = require('../../infrastructure/database/repositories/UserRepository');
const MenuRepository = require('../../infrastructure/database/repositories/MenuRepository');
const CustomerRepository = require('../../infrastructure/database/repositories/CustomerRepository');
const SettingsRepository = require('../../infrastructure/database/repositories/SettingsRepository');
const CategoryPromotionRepository = require('../../infrastructure/database/repositories/CategoryPromotionRepository');
const ReportRepository = require('../../infrastructure/database/repositories/ReportRepository');

// ── Use Cases ─────────────────────────────────────────────────────────────────
const { CreateOrder, GetOrders, GetOrderById, UpdateOrderItems, UpdateOrderStatus } = require('../../use-cases/orders');
const DeleteOrder = require('../../use-cases/orders/DeleteOrder');
const LoginUser = require('../../use-cases/auth/LoginUser');
const { GetMenu, CreateMenuItem, UpdateMenuItem, DeleteMenuItem } = require('../../use-cases/menu');
const { GetCategoryPromotions, CreateCategoryPromotion, UpdateCategoryPromotion, DeleteCategoryPromotion } = require('../../use-cases/menu/PromotionUseCases');
const { GetUsers, CreateUser, UpdateUser, DeleteUser } = require('../../use-cases/users/UserUseCases');
const GetSalesReport = require('../../use-cases/reports/GetSalesReport');
const WhatsAppUseCases = require('../../use-cases/whatsapp/WhatsAppUseCases');
const MaintenanceUseCases = require('../../use-cases/maintenance/MaintenanceUseCases');

// ── Controllers ───────────────────────────────────────────────────────────────
const OrderController = require('../../interface-adapters/controllers/OrderController');
const AuthController = require('../../interface-adapters/controllers/AuthController');
const MenuController = require('../../interface-adapters/controllers/MenuController');
const UserController = require('../../interface-adapters/controllers/UserController');
const PromotionController = require('../../interface-adapters/controllers/PromotionController');
const ReportController = require('../../interface-adapters/controllers/ReportController');
const WhatsAppController = require('../../interface-adapters/controllers/WhatsAppController');
const SettingsController = require('../../interface-adapters/controllers/SettingsController');
const MaintenanceController = require('../../interface-adapters/controllers/MaintenanceController');

// ── External Services ─────────────────────────────────────────────────────────
const whatsappService = require('../../../whatsappService');

class Container {
    constructor() {
        this._deps = new Map();
        this._setupDependencies();
    }

    _setupDependencies() {
        const jwtSecret = process.env.JWT_SECRET || 'restaurant-pos-secret-key-change-in-production';
        const dbPath = process.env.DB_PATH || null;

        const database = new DatabaseConnection(dbPath);
        this.register('database', database);
        this.register('logger', logger);
        this.register('whatsappService', whatsappService);

        // Repositories
        const orderRepository = new OrderRepository(database);
        const userRepository = new UserRepository(database);
        const menuRepository = new MenuRepository(database);
        const customerRepository = new CustomerRepository(database);
        const settingsRepository = new SettingsRepository(database);
        const promotionRepository = new CategoryPromotionRepository(database);
        const reportRepository = new ReportRepository(database);

        this.register('orderRepository', new OrderRepository(database, promotionRepository));
        this.register('userRepository', userRepository);
        this.register('menuRepository', menuRepository);
        this.register('customerRepository', customerRepository);
        this.register('settingsRepository', settingsRepository);
        this.register('promotionRepository', promotionRepository);
        this.register('reportRepository', reportRepository);

        // Use Cases
        this.register('createOrderUseCase', new CreateOrder(this.resolve('orderRepository'), menuRepository, promotionRepository));
        this.register('getOrdersUseCase', new GetOrders(orderRepository));
        this.register('getOrderByIdUseCase', new GetOrderById(orderRepository));
        this.register('updateOrderItemsUseCase', new UpdateOrderItems(this.resolve('orderRepository'), menuRepository, promotionRepository));
        this.register('updateOrderStatusUseCase', new UpdateOrderStatus(orderRepository));
        this.register('deleteOrderUseCase', new DeleteOrder(orderRepository));

        this.register('loginUserUseCase', new LoginUser(userRepository, jwtSecret));

        this.register('getMenuUseCase', new GetMenu(menuRepository));
        this.register('createMenuItemUseCase', new CreateMenuItem(menuRepository));
        this.register('updateMenuItemUseCase', new UpdateMenuItem(menuRepository));
        this.register('deleteMenuItemUseCase', new DeleteMenuItem(menuRepository));

        this.register('getCategoryPromotions', new GetCategoryPromotions(promotionRepository));
        this.register('createCategoryPromotion', new CreateCategoryPromotion(promotionRepository));
        this.register('updateCategoryPromotion', new UpdateCategoryPromotion(promotionRepository));
        this.register('deleteCategoryPromotion', new DeleteCategoryPromotion(promotionRepository));

        this.register('getUsersUseCase', new GetUsers(userRepository));
        this.register('createUserUseCase', new CreateUser(userRepository));
        this.register('updateUserUseCase', new UpdateUser(userRepository));
        this.register('deleteUserUseCase', new DeleteUser(userRepository));

        this.register('getSalesReportUseCase', new GetSalesReport(reportRepository));
        this.register('whatsAppUseCases', new WhatsAppUseCases(whatsappService));
        this.register('maintenanceUseCases', new MaintenanceUseCases(menuRepository, orderRepository));

        // Controllers
        this.register('orderController', new OrderController({
            createOrderUseCase: this.resolve('createOrderUseCase'),
            getOrdersUseCase: this.resolve('getOrdersUseCase'),
            getOrderByIdUseCase: this.resolve('getOrderByIdUseCase'),
            updateOrderItemsUseCase: this.resolve('updateOrderItemsUseCase'),
            updateOrderStatusUseCase: this.resolve('updateOrderStatusUseCase'),
            deleteOrderUseCase: this.resolve('deleteOrderUseCase')
        }));
        this.register('authController', new AuthController({ loginUserUseCase: this.resolve('loginUserUseCase') }));
        this.register('menuController', new MenuController({
            getMenuUseCase: this.resolve('getMenuUseCase'),
            createMenuItemUseCase: this.resolve('createMenuItemUseCase'),
            updateMenuItemUseCase: this.resolve('updateMenuItemUseCase'),
            deleteMenuItemUseCase: this.resolve('deleteMenuItemUseCase')
        }));
        this.register('userController', new UserController({
            getUsersUseCase: this.resolve('getUsersUseCase'),
            createUserUseCase: this.resolve('createUserUseCase'),
            updateUserUseCase: this.resolve('updateUserUseCase'),
            deleteUserUseCase: this.resolve('deleteUserUseCase')
        }));
        this.register('promotionController', new PromotionController({
            getCategoryPromotions: this.resolve('getCategoryPromotions'),
            createCategoryPromotion: this.resolve('createCategoryPromotion'),
            updateCategoryPromotion: this.resolve('updateCategoryPromotion'),
            deleteCategoryPromotion: this.resolve('deleteCategoryPromotion')
        }));
        this.register('reportController', new ReportController({ getSalesReport: this.resolve('getSalesReportUseCase') }));
        this.register('whatsappController', new WhatsAppController({ whatsAppUseCases: this.resolve('whatsAppUseCases') }));
        this.register('settingsController', new SettingsController({ settingsRepository: this.resolve('settingsRepository') }));
        this.register('maintenanceController', new MaintenanceController({ maintenanceUseCases: this.resolve('maintenanceUseCases') }));

        this.register('jwtSecret', jwtSecret);
    }

    register(name, dep) { this._deps.set(name, dep); }
    resolve(name) {
        if (!this._deps.has(name)) throw new Error(`Dependency "${name}" not found in container`);
        return this._deps.get(name);
    }
    has(name) { return this._deps.has(name); }
}

module.exports = new Container();
