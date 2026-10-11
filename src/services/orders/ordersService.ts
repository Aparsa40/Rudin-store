import { Order, OrderStatus, Address, PaymentMethod, ResolvedCartItem } from '../../types';

// Orders are persisted locally in the browser only. There is no backend order
// API yet, so nothing here may imply server-side or cross-device persistence,
// and no order may ever be created in a paid or shipped state.

const getStoredOrders = (): Order[] => {
  try {
    const data = localStorage.getItem('rudin_orders');
    if (data) return JSON.parse(data);
  } catch (e) {
    // Ignore
  }
  return [];
};

const saveStoredOrders = (orders: Order[]) => {
  try {
    localStorage.setItem('rudin_orders', JSON.stringify(orders));
  } catch (e) {
    // Ignore
  }
};

export const ordersService = {
  getOrders: async (userId?: string): Promise<Order[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const all = getStoredOrders();
    if (userId) {
      return all.filter((o) => o.userId === userId);
    }
    return all;
  },

  getOrderById: async (id: string): Promise<Order | null> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const all = getStoredOrders();
    return all.find((o) => o.id === id || o.orderNumber === id) || null;
  },

  createOrder: async (params: {
    userId: string;
    items: ResolvedCartItem[];
    shippingAddress: Address;
    billingAddress: Address;
    shippingMethod: string;
    paymentMethod: PaymentMethod;
    subtotal: number;
    discount: number;
    shippingCost: number;
    tax: number;
    total: number;
  }): Promise<Order> => {
    await new Promise((resolve) => setTimeout(resolve, 350));

    // No payment gateway is integrated: an order must never be created as
    // PAID. Online payment methods remain PENDING until an authoritative
    // confirmation exists, and cash on delivery stays unpaid until settlement
    // on delivery. No tracking number or carrier is fabricated here; they are
    // assigned only when a shipment actually exists.
    const orderId = `ord_${Date.now()}`;
    const orderNumber = `RD-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      userId: params.userId,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: params.paymentMethod,
      shippingAddress: params.shippingAddress,
      billingAddress: params.billingAddress,
      shippingMethod: params.shippingMethod,
      subtotal: params.subtotal,
      discount: params.discount,
      shippingCost: params.shippingCost,
      tax: params.tax,
      total: params.total,
      items: params.items.map((item) => ({
        id: `oi_${Math.random().toString(36).substring(2, 9)}`,
        orderId,
        productId: item.product.id,
        productTitle: item.product.title,
        productImage: item.product.images[0]?.url || '',
        variantId: item.variant?.id,
        variantName: item.variant?.name,
        vendorId: item.vendor.id,
        vendorName: item.vendor.storeName,
        quantity: item.quantity,
        unitPrice: item.variant ? item.variant.price : item.product.price,
        subtotal: (item.variant ? item.variant.price : item.product.price) * item.quantity,
      })),
      timeline: [
        {
          title: 'Order Placed',
          description:
            params.paymentMethod === 'CASH_ON_DELIVERY'
              ? 'Your order has been placed. Payment will be collected on delivery.'
              : 'Your order has been placed and is awaiting payment confirmation.',
          date: 'Just now',
          completed: true,
          current: true,
        },
        {
          title: 'Vendor Processing',
          description: 'Vendors are handcrafting and packaging your items',
          date: 'Pending',
          completed: false,
        },
        {
          title: 'Dispatched',
          description: 'Carrier pickup and departure',
          date: 'Pending',
          completed: false,
        },
        {
          title: 'Delivered',
          description: 'Delivered to your doorstep',
          date: 'Estimated 3-5 days',
          completed: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const current = getStoredOrders();
    const updated = [newOrder, ...current];
    saveStoredOrders(updated);

    return newOrder;
  },

  cancelOrder: async (orderId: string, reason: string): Promise<Order> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const current = getStoredOrders();
    const orderIndex = current.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Order not found');

    const updatedOrder: Order = {
      ...current[orderIndex],
      status: 'CANCELLED',
      timeline: [
        ...current[orderIndex].timeline,
        {
          title: 'Order Cancelled',
          description: `Cancellation reason: ${reason}`,
          date: 'Just now',
          completed: true,
          current: true,
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    current[orderIndex] = updatedOrder;
    saveStoredOrders(current);
    return updatedOrder;
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<Order> => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const current = getStoredOrders();
    const orderIndex = current.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Order not found');

    current[orderIndex].status = status;
    current[orderIndex].updatedAt = new Date().toISOString();
    saveStoredOrders(current);
    return current[orderIndex];
  },
};
