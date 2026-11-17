#!/usr/bin/env node

import mongoose from 'mongoose';
import { User, Expert, Service, Booking } from './backend/src/models/index.js';

const MONGODB_URI = 'mongodb://127.0.0.1:27018/experthub?replicaSet=rs0&retryWrites=true&w=majority';

async function checkDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('\n📊 DATABASE STATE\n' + '='.repeat(50));

    const users = await User.countDocuments();
    const experts = await Expert.countDocuments();
    const services = await Service.countDocuments();
    const bookings = await Booking.countDocuments();

    console.log(`\nCounts:\n  Users: ${users}\n  Experts: ${experts}\n  Services: ${services}\n  Bookings: ${bookings}`);

    const bookingStatuses = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    console.log('\nBooking Statuses:');
    bookingStatuses.forEach(b => {
      console.log(`  ${b._id || 'null'}: ${b.count}`);
    });

    // Show first few bookings
    const recentBookings = await Booking.find().limit(3).populate('clientId', 'email').populate('expertId', 'firstName');
    if (recentBookings.length > 0) {
      console.log('\nRecent Bookings:');
      recentBookings.forEach(b => {
        console.log(`  - ${b._id} (${b.status})`);
        console.log(`    Client: ${b.clientId?.email || 'N/A'}`);
        console.log(`    Expert: ${b.expertId?.firstName || 'N/A'}`);
      });
    }

    console.log('\n' + '='.repeat(50) + '\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

checkDB();
