export const sourceContracts = [
  { name: 'products', path: '/api/products', expectedStatuses: [200] },
  { name: 'invalid product id', path: '/api/products/invalid-id', expectedStatuses: [400, 404] },
  { name: 'catalog variants', path: '/api/products/invalid-id/variants', expectedStatuses: [400, 404] },
  { name: 'invalid price format', path: '/api/products?minPrice=invalid', expectedStatuses: [400] },
  { name: 'cart read', path: '/api/cart', expectedStatuses: [200, 401] },
  { name: 'negative cart quantity', path: '/api/cart?quantity=-1', expectedStatuses: [400, 401] },
  { name: 'orders read', path: '/api/orders', expectedStatuses: [200, 401] },
  { name: 'invalid order id', path: '/api/orders/invalid-id', expectedStatuses: [400, 401, 404] },
  { name: 'admin authorization', path: '/api/admin/products', expectedStatuses: [401, 403] },
];
