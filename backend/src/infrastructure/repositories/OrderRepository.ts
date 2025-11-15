import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { Order, OrderStatus } from '@domain/entities/Order';
import { OrderPassenger } from '@domain/entities/OrderPassenger';
import { OrderService, ServiceType } from '@domain/entities/OrderService';
import { Price } from '@domain/value-objects/Price';
import { pool } from '../database/PostgresConnection';
import { DatabaseError } from '@shared/errors';

export class OrderRepository implements IOrderRepository {
  async findById(id: string): Promise<Order | null> {
    try {
      const orderResult = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );

      if (orderResult.rows.length === 0) {
        return null;
      }

      const orderRow = orderResult.rows[0];

      // Загрузка пассажиров
      const passengersResult = await pool.query(
        'SELECT * FROM order_passengers WHERE order_id = $1',
        [id]
      );

      // Загрузка услуг
      const servicesResult = await pool.query(
        'SELECT * FROM order_services WHERE order_id = $1',
        [id]
      );

      return this.mapToOrder(orderRow, passengersResult.rows, servicesResult.rows);
    } catch (error) {
      throw new DatabaseError('Failed to find order', { id, error });
    }
  }

  async findByUserId(userId: string): Promise<Order[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      const orders: Order[] = [];

      for (const orderRow of result.rows) {
        // Загрузка пассажиров
        const passengersResult = await pool.query(
          'SELECT * FROM order_passengers WHERE order_id = $1',
          [orderRow.id]
        );

        // Загрузка услуг
        const servicesResult = await pool.query(
          'SELECT * FROM order_services WHERE order_id = $1',
          [orderRow.id]
        );

        orders.push(this.mapToOrder(orderRow, passengersResult.rows, servicesResult.rows));
      }

      return orders;
    } catch (error) {
      throw new DatabaseError('Failed to find orders by user', { userId, error });
    }
  }

  async create(order: Order): Promise<Order> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Создание заказа
      const orderResult = await client.query(
        `INSERT INTO orders (id, user_id, route_id, status, total_price_amount, total_price_currency, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          order.id,
          order.userId,
          order.routeId,
          order.status,
          order.totalPrice.amount,
          order.totalPrice.currency,
          order.createdAt || new Date(),
          order.updatedAt || new Date(),
        ]
      );

      // Создание пассажиров
      for (const passenger of order.passengers) {
        await client.query(
          `INSERT INTO order_passengers (id, order_id, full_name, document_number, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            passenger.id,
            passenger.orderId,
            passenger.fullName,
            passenger.documentNumber,
            passenger.createdAt || new Date(),
          ]
        );
      }

      // Создание услуг
      for (const service of order.services) {
        await client.query(
          `INSERT INTO order_services (id, order_id, service_type, service_id, name, price_amount, price_currency, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            service.id,
            service.orderId,
            service.serviceType,
            service.serviceId,
            service.name,
            service.price.amount,
            service.price.currency,
            service.createdAt || new Date(),
          ]
        );
      }

      await client.query('COMMIT');

      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new DatabaseError('Failed to create order', { orderId: order.id, error });
    } finally {
      client.release();
    }
  }

  async update(order: Order): Promise<Order> {
    try {
      const result = await pool.query(
        `UPDATE orders 
         SET status = $2, total_price_amount = $3, total_price_currency = $4, updated_at = $5,
             confirmed_at = $6, cancelled_at = $7
         WHERE id = $1
         RETURNING *`,
        [
          order.id,
          order.status,
          order.totalPrice.amount,
          order.totalPrice.currency,
          order.updatedAt || new Date(),
          order.confirmedAt || null,
          order.cancelledAt || null,
        ]
      );

      if (result.rows.length === 0) {
        throw new DatabaseError('Order not found for update', { id: order.id });
      }

      // Загрузка связанных данных
      const passengersResult = await pool.query(
        'SELECT * FROM order_passengers WHERE order_id = $1',
        [order.id]
      );

      const servicesResult = await pool.query(
        'SELECT * FROM order_services WHERE order_id = $1',
        [order.id]
      );

      return this.mapToOrder(result.rows[0], passengersResult.rows, servicesResult.rows);
    } catch (error) {
      throw new DatabaseError('Failed to update order', { orderId: order.id, error });
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await pool.query('DELETE FROM orders WHERE id = $1', [id]);
    } catch (error) {
      throw new DatabaseError('Failed to delete order', { id, error });
    }
  }

  private mapToOrder(
    orderRow: any,
    passengerRows: any[],
    serviceRows: any[]
  ): Order {
    const passengers = passengerRows.map(
      (row) =>
        new OrderPassenger(
          row.id,
          row.order_id,
          row.full_name,
          row.document_number,
          row.created_at
        )
    );

    const services = serviceRows.map(
      (row) =>
        new OrderService(
          row.id,
          row.order_id,
          row.service_type as ServiceType,
          row.service_id,
          row.name,
          new Price(row.price_amount, row.price_currency),
          row.created_at
        )
    );

    return new Order(
      orderRow.id,
      orderRow.user_id,
      orderRow.route_id,
      orderRow.status as OrderStatus,
      new Price(orderRow.total_price_amount, orderRow.total_price_currency),
      passengers,
      services,
      orderRow.created_at,
      orderRow.updated_at,
      orderRow.confirmed_at,
      orderRow.cancelled_at
    );
  }
}

