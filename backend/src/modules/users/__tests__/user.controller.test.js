import mongoose from 'mongoose';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { User, Booking, Transaction } from '../../../models/index.js';
import { listUsers } from '../user.controller.js';

describe('listUsers settled spend', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns gross settled spend by currency after completed refunds', async () => {
    const clientId = new mongoose.Types.ObjectId();
    const userRecord = {
      _id: clientId,
      firstName: 'Test',
      lastName: 'Client',
      email: 'client@example.test',
      role: 'client',
      status: 'active',
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([userRecord]),
    };
    jest.spyOn(User, 'countDocuments').mockResolvedValue(1);
    jest.spyOn(User, 'find').mockReturnValue(query);
    jest.spyOn(Booking, 'aggregate').mockResolvedValue([
      { _id: clientId, totalBookings: 2, completedBookings: 1, cancelledBookings: 1 },
    ]);
    jest.spyOn(Transaction, 'aggregate')
      .mockResolvedValueOnce([
        { _id: { userId: clientId, currency: 'USD' }, amountCents: 10000 },
        { _id: { userId: clientId, currency: 'EUR' }, amountCents: 12000 },
      ])
      .mockResolvedValueOnce([
        { _id: { userId: clientId, currency: 'USD' }, amount: 10 },
        { _id: { userId: clientId, currency: 'EUR' }, amount: 12.35 },
      ]);

    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await listUsers({ query: { role: 'client' } }, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(200);
    const [customer] = response.json.mock.calls[0][0].data.users;
    expect(customer.settledSpendByCurrency).toEqual([
      { currency: 'USD', amount: 90 },
      { currency: 'EUR', amount: 107.65 },
    ]);
    expect(customer.totalSpent).toBeNull();
    expect(customer.totalBookings).toBe(2);
    expect(query.select).toHaveBeenCalledWith('firstName lastName email role status profilePicture createdAt');
  });
});
