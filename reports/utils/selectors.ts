import { db } from '../../db';

export const calcOrderTotal = (orderId: number) => {
  const o = db.getOrderById(orderId);
  const total = o?.items?.reduce((acc, i) => acc + Number(i.total_price), 0) || 0;
  const paid = Number(o?.prepayment || '0');
  const debt = total - paid;
  const sumBefore = o?.items?.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.price)), 0) || 0;
  const discount = sumBefore - total;
  return { total, paid, debt, sumBefore, discount };
};