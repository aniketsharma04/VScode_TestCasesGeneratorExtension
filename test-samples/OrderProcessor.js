/**
 * OrderProcessor - Sample JavaScript class for testing
 * This class handles order processing with various methods
 */

class OrderProcessor {
    constructor() {
        this.orders = [];
        this.coupons = {
            'SAVE10': 0.10,
            'SAVE20': 0.20,
            'SUMMER25': 0.25
        };
        this.taxRate = 0.18;
    }

    /**
     * Place a new order
     */
    placeOrder(order) {
        if (!order || !order.orderId) {
            throw new Error('Invalid order: orderId is required');
        }
        
        if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
            throw new Error('Invalid order: items array is required and must not be empty');
        }
        
        const processedOrder = {
            ...order,
            processedDate: new Date().toISOString(),
            status: 'processing'
        };
        
        this.orders.push(processedOrder);
        return processedOrder;
    }

    /**
     * Apply coupon discount to subtotal
     */
    applyCoupon(subtotal, couponCode) {
        if (typeof subtotal !== 'number' || subtotal < 0) {
            throw new Error('Invalid subtotal');
        }
        
        if (!couponCode || typeof couponCode !== 'string') {
            return subtotal;
        }
        
        const discount = this.coupons[couponCode.toUpperCase()];
        if (!discount) {
            throw new Error('Invalid coupon code');
        }
        
        return subtotal * (1 - discount);
    }

    /**
     * Calculate tax for a given amount
     */
    calculateTax(amount) {
        if (typeof amount !== 'number' || amount < 0) {
            throw new Error('Invalid amount for tax calculation');
        }
        
        return amount * this.taxRate;
    }

    /**
     * Get total order count
     */
    getOrderCount() {
        return this.orders.length;
    }

    /**
     * Find order by ID
     */
    findOrderById(orderId) {
        return this.orders.find(order => order.orderId === orderId);
    }

    /**
     * Calculate order total including tax
     */
    calculateTotal(items, couponCode = null) {
        if (!Array.isArray(items)) {
            throw new Error('Items must be an array');
        }
        
        let subtotal = items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        
        if (couponCode) {
            subtotal = this.applyCoupon(subtotal, couponCode);
        }
        
        const tax = this.calculateTax(subtotal);
        return subtotal + tax;
    }
}

module.exports = OrderProcessor;
