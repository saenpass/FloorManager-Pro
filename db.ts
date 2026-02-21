
import { Category, Position, Order, OrderItem, CargoStatus, User, WorkCategory, WorkPosition } from './types';

const DB_KEY = 'FLOOR_MANAGER_DB';

interface StorageSchema {
  categories: Category[];
  positions: Position[];
  orders: Order[];
  orderItems: OrderItem[];
  cargoStatuses: CargoStatus[];
  users: User[];
  workCategories: WorkCategory[];
  workPositions: WorkPosition[];
  licenseKey: string | null;
}

const DEFAULT_DB: StorageSchema = {
  categories: [
    { id: 1, name: 'Винил', order_index: 1, color: '#10b981' },
    { id: 2, name: 'Доска', order_index: 2, color: '#f59e0b' },
    { id: 3, name: 'Забор', order_index: 3, color: '#ef4444' },
    { id: 4, name: 'Кварц-Паркет', order_index: 4, color: '#3b82f6' },
    { id: 5, name: 'Ламинат', order_index: 5, color: '#3b82f6' },
    { id: 6, name: 'Модульный паркет', order_index: 6, color: '#f59e0b' },
    { id: 7, name: 'Подложка', order_index: 7, color: '#94a3b8' },
    { id: 8, name: 'Плинтус', order_index: 8, color: '#94a3b8' },
    { id: 9, name: 'Расходник', order_index: 9, color: '#94a3b8' },
    { id: 10, name: 'Фанера', order_index: 10, color: '#94a3b8' },
    { id: 11, name: 'Услуга', order_index: 11, color: '#10b981' },
    { id: 12, name: 'Химия', order_index: 12, color: '#10b981' },
    { id: 24, name: 'Лестница', order_index: 13, color: '#f59e0b' },
    { id: 25, name: 'Декоративный элемент', order_index: 14, color: '#3b82f6' },
    { id: 26, name: 'Работа', order_index: 15, color: '#10b981' },
    { id: 27, name: 'Линолеум', order_index: 16, color: '#10b981' },
  ],
  positions: [],
  orders: [],
  orderItems: [],
  workCategories: [
    { id: 1, name: 'Подготовка основания' },
    { id: 2, name: 'Укладка покрытий' },
    { id: 3, name: 'Монтаж плинтуса и порогов' },
    { id: 4, name: 'Дополнительные услуги' }
  ],
  workPositions: [
    { id: 1, categoryId: 1, name: 'Грунтование пола', price: '100', unit: 'м²' },
    { id: 2, categoryId: 1, name: 'Шлифовка стяжки', price: '250', unit: 'м²' },
    { id: 3, categoryId: 1, name: 'Наливной пол (работа)', price: '450', unit: 'м²' },
    { id: 4, categoryId: 2, name: 'Укладка ламината', price: '350', unit: 'м²' },
    { id: 5, categoryId: 2, name: 'Укладка винила (кварц-винил)', price: '400', unit: 'м²' },
    { id: 6, categoryId: 2, name: 'Укладка паркетной доски', price: '650', unit: 'м²' },
    { id: 7, categoryId: 3, name: 'Монтаж плинтуса (пластик)', price: '150', unit: 'мп' },
    { id: 8, categoryId: 3, name: 'Монтаж плинтуса (МДФ)', price: '300', unit: 'мп' },
    { id: 9, categoryId: 4, name: 'Вынос мусора', price: '2000', unit: 'рейс' }
  ],
  cargoStatuses: [
    { id: 1, name: 'предзаказ', order_index: 0, color: '#94a3b8', text_color: '#ffffff' },
    { id: 2, name: 'у поставщика', order_index: 1, color: '#f59e0b', text_color: '#ffffff' },
    { id: 3, name: 'в транспортной', order_index: 2, color: '#3b82f6', text_color: '#ffffff' },
    { id: 4, name: 'в машине', order_index: 3, color: '#3b82f6', text_color: '#ffffff' },
    { id: 5, name: 'на складе', order_index: 4, color: '#10b981', text_color: '#ffffff' },
    { id: 6, name: 'в магазине', order_index: 5, color: '#10b981', text_color: '#ffffff' },
    { id: 7, name: 'у клиента (долг)', order_index: 6, color: '#ef4444', text_color: '#ffffff' },
    { id: 8, name: 'у клиента', order_index: 7, color: '#059669', text_color: '#ffffff' },
    { id: 9, name: 'отменён', order_index: 8, color: '#374151', text_color: '#ffffff' },
    { id: 10, name: 'возврат', order_index: 9, color: '#374151', text_color: '#ffffff' }
  ],
  users: [
    {
      id: 1,
      username: 'Администратор',
      role: 'admin',
      permissions: {
        dashboard: 'edit',
        orders: 'edit',
        positions: 'edit',
        categories: 'edit',
        debtors: 'edit',
        analytics: 'edit',
        settings: 'edit'
      }
    }
  ],
  licenseKey: null
};

export const getDB = (): StorageSchema => {
  const data = localStorage.getItem(DB_KEY);
  if (!data) return DEFAULT_DB;
  const parsed = JSON.parse(data);
  if (!parsed.orderItems) parsed.orderItems = [];
  if (!parsed.orders) parsed.orders = [];
  if (!parsed.categories) parsed.categories = DEFAULT_DB.categories;
  if (!parsed.positions) parsed.positions = [];
  if (!parsed.users) parsed.users = DEFAULT_DB.users;
  if (!parsed.workCategories) parsed.workCategories = DEFAULT_DB.workCategories;
  if (!parsed.workPositions) parsed.workPositions = DEFAULT_DB.workPositions;
  return parsed;
};

export const saveDB = (data: StorageSchema) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};

const getNextId = (items: { id: number }[]) => {
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
};

export const db = {
  getRawData: () => getDB(),
  getUsers: () => getDB().users,
  getCategories: () => getDB().categories.sort((a, b) => a.order_index - b.order_index),
  getPositions: () => getDB().positions,
  getCargoStatuses: () => getDB().cargoStatuses,
  getWorkCategories: () => getDB().workCategories,
  getWorkPositions: () => getDB().workPositions,

  getOrders: () => {
    const s = getDB();
    return s.orders.map(o => ({
      ...o,
      items: (s.orderItems || []).filter(item => Number(item.orderId) === Number(o.id))
    }));
  },

  getOrderById: (id: number) => {
    const s = getDB();
    const order = s.orders.find(o => Number(o.id) === Number(id));
    if (!order) return null;
    return {
      ...order,
      items: (s.orderItems || []).filter(item => Number(item.orderId) === Number(order.id))
    };
  },

  bulkAddOrders: (newOrders: any[]) => {
    const s = getDB();
    let addedCount = 0;
    let itemsCount = 0;

    newOrders.forEach(o => {
      const isDjango = o.pk !== undefined && o.fields !== undefined;
      const f = isDjango ? o.fields : o;
      const orderId = Number(isDjango ? o.pk : (o.id || getNextId(s.orders)));

      if (!s.orders.find(existing => Number(existing.id) === orderId)) {
        s.orders.push({
          id: orderId,
          invoice_number: f.invoice_number || `№ ${orderId.toString().padStart(4, '0')}`,
          order_date: f.order_date || new Date().toISOString().split('T')[0],
          client_name: f.client_name || 'Anonymous',
          client_phone: f.client_phone || '-',
          prepayment: String(f.prepayment || '0'),
          delivery_address: f.delivery_address || '-',
          shipping_date: f.shipping_date || null,
          cargo_status_id: Number(f.cargo_status || f.cargo_status_id || 1),
          note: f.note || null,
          remind: !!f.remind,
          is_completed: !!f.is_completed,
          is_deleted: !!f.is_deleted,
          created_at: f.created_at || new Date().toISOString(),
          updated_at: f.updated_at || new Date().toISOString()
        });
        addedCount++;

        if (f.items && Array.isArray(f.items)) {
          f.items.forEach((item: any) => {
            const iF = item.fields || item;
            const itemId = Number(item.pk || item.id || getNextId(s.orderItems));
            s.orderItems.push({
              id: itemId,
              orderId: orderId,
              positionId: Number(iF.position || iF.positionId || 0),
              position_name: iF.position_name || 'Item',
              category_name: iF.category_name || 'General',
              quantity: parseFloat(String(iF.quantity || '0')),
              price: String(iF.price || '0'),
              discount: String(iF.discount || '0'),
              total_price: String(iF.total_price || '0')
            });
            itemsCount++;
          });
        }
      }
    });
    saveDB(s);
    return { addedCount, itemsCount };
  },

  bulkAddOrderItems: (items: any[]) => {
    const s = getDB();
    let count = 0;
    items.forEach(item => {
      const isDjango = item.pk !== undefined && item.fields !== undefined;
      const f = isDjango ? item.fields : item;
      const orderId = Number(f.order || f.orderId);
      if (!orderId) return;

      const itemId = Number(isDjango ? item.pk : (item.id || getNextId(s.orderItems)));
      if (!s.orderItems.find(existing => Number(existing.id) === itemId)) {
        s.orderItems.push({
          id: itemId,
          orderId: orderId,
          positionId: Number(f.position || f.positionId || 0),
          position_name: f.position_name || 'Item',
          category_name: f.category_name || 'General',
          quantity: parseFloat(String(f.quantity || '0')),
          price: String(f.price || '0'),
          discount: String(f.discount || '0'),
          total_price: String(f.total_price || '0')
        });
        count++;
      }
    });
    saveDB(s);
    return count;
  },

  createOrder: (order: Omit<Order, 'id' | 'invoice_number'>, items: Omit<OrderItem, 'id' | 'orderId'>[]) => {
    const s = getDB();
    const orderId = getNextId(s.orders);
    const invoice_number = `№ ${orderId.toString().padStart(4, '0')}`;
    const newOrder = { ...order, id: orderId, invoice_number } as Order;
    s.orders.push(newOrder);
    let nextItemId = getNextId(s.orderItems);
    items.forEach(i => s.orderItems.push({ ...i, id: nextItemId++, orderId: Number(orderId) }));
    saveDB(s);
    return newOrder;
  },

  updateOrder: (id: number, orderUpdate: Partial<Order>, itemsUpdate?: Omit<OrderItem, 'id' | 'orderId'>[]) => {
    const s = getDB();
    const idx = s.orders.findIndex(o => Number(o.id) === Number(id));
    if (idx !== -1) {
      s.orders[idx] = { ...s.orders[idx], ...orderUpdate, updated_at: new Date().toISOString() };
      if (itemsUpdate) {
        s.orderItems = s.orderItems.filter(item => Number(item.orderId) !== Number(id));
        let nextItemId = getNextId(s.orderItems);
        itemsUpdate.forEach(i => s.orderItems.push({ ...i, id: nextItemId++, orderId: Number(id) }));
      }
      saveDB(s);
    }
  },

  deleteOrder: (id: number) => {
    const s = getDB();
    const idx = s.orders.findIndex(o => Number(o.id) === Number(id));
    if (idx !== -1) {
      s.orders[idx].is_deleted = true;
      saveDB(s);
    }
  },

  clearOrders: () => {
    const s = getDB();
    s.orders = [];
    s.orderItems = [];
    saveDB(s);
  },
  
  getLicense: () => getDB().licenseKey,
  saveLicense: (key: string) => {
    const s = getDB();
    s.licenseKey = key;
    saveDB(s);
  },

  addCategory: (cat: Omit<Category, 'id'>) => {
    const s = getDB();
    const newCat = { ...cat, id: getNextId(s.categories) };
    s.categories.push(newCat);
    saveDB(s);
    return newCat;
  },
  updateCategory: (id: number, update: Partial<Category>) => {
    const s = getDB();
    const idx = s.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      s.categories[idx] = { ...s.categories[idx], ...update };
      saveDB(s);
    }
  },
  deleteCategory: (id: number) => {
    const s = getDB();
    s.categories = s.categories.filter(c => c.id !== id);
    saveDB(s);
  },
  clearCategories: () => {
    const s = getDB();
    s.categories = [];
    saveDB(s);
  },
  bulkAddCategories: (cats: Omit<Category, 'id'>[]) => {
    const s = getDB();
    let nextId = getNextId(s.categories);
    let count = 0;
    cats.forEach(c => {
      s.categories.push({ ...c, id: nextId++ });
      count++;
    });
    saveDB(s);
    return count;
  },

  addPosition: (pos: Omit<Position, 'id'>) => {
    const s = getDB();
    const newPos = { ...pos, id: getNextId(s.positions) };
    s.positions.push(newPos);
    saveDB(s);
    return newPos;
  },
  updatePosition: (id: number, update: Partial<Position>) => {
    const s = getDB();
    const idx = s.positions.findIndex(p => p.id === id);
    if (idx !== -1) {
      s.positions[idx] = { ...s.positions[idx], ...update };
      saveDB(s);
    }
  },
  deletePosition: (id: number) => {
    const s = getDB();
    s.positions = s.positions.filter(p => p.id !== id);
    saveDB(s);
  },
  clearPositions: () => {
    const s = getDB();
    s.positions = [];
    saveDB(s);
  },
  bulkAddPositions: (positions: Omit<Position, 'id'>[]) => {
    const s = getDB();
    let nextId = getNextId(s.positions);
    let count = 0;
    positions.forEach(p => {
      s.positions.push({ ...p, id: nextId++ });
      count++;
    });
    saveDB(s);
    return count;
  },

  addUser: (user: Omit<User, 'id'>) => {
    const s = getDB();
    const newUser = { ...user, id: getNextId(s.users) };
    s.users.push(newUser);
    saveDB(s);
    return newUser;
  },
  updateUser: (id: number, update: Partial<User>) => {
    const s = getDB();
    const idx = s.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      s.users[idx] = { ...s.users[idx], ...update };
      saveDB(s);
    }
  },
  deleteUser: (id: number) => {
    const s = getDB();
    s.users = s.users.filter(u => u.id !== id);
    saveDB(s);
  },

  addWorkPosition: (work: Omit<WorkPosition, 'id'>) => {
    const s = getDB();
    const newWork = { ...work, id: getNextId(s.workPositions) };
    s.workPositions.push(newWork);
    saveDB(s);
    return newWork;
  },
  updateWorkPosition: (id: number, update: Partial<WorkPosition>) => {
    const s = getDB();
    const idx = s.workPositions.findIndex(w => w.id === id);
    if (idx !== -1) {
      s.workPositions[idx] = { ...s.workPositions[idx], ...update };
      saveDB(s);
    }
  },
  deleteWorkPosition: (id: number) => {
    const s = getDB();
    s.workPositions = s.workPositions.filter(w => w.id !== id);
    saveDB(s);
  },
  bulkAddWorkPositions: (works: Omit<WorkPosition, 'id'>[]) => {
    const s = getDB();
    let nextId = getNextId(s.workPositions);
    let count = 0;
    works.forEach(w => {
      s.workPositions.push({ ...w, id: nextId++ });
      count++;
    });
    saveDB(s);
    return count;
  },

  importRawData: (data: StorageSchema) => {
    saveDB(data);
  },
  nuclearWipe: () => {
    localStorage.removeItem(DB_KEY);
  },
  clearAllData: () => {
    const s = getDB();
    s.orders = [];
    s.orderItems = [];
    s.positions = [];
    saveDB(s);
  }
};
