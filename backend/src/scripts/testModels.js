import '../config/database.js';
import { User, Expert, Service, Booking, BookingHold, Review } from '../models/index.js';

async function testModels() {
  console.log('\n🧪 Testing Model Imports and Basic Operations\n');
  
  try {
    // Test 1: User Model
    console.log('✓ User model imported');
    console.log(`  - Fields: ${Object.keys(User.schema.paths).length}`);
    
    // Test 2: Expert Model  
    console.log('✓ Expert model imported');
    console.log(`  - Fields: ${Object.keys(Expert.schema.paths).length}`);
    console.log(`  - Has availability: ${!!Expert.schema.paths.availability}`);
    console.log(`  - Has stats: ${!!Expert.schema.paths.stats}`);
    
    // Test 3: Service Model
    console.log('✓ Service model imported');
    console.log(`  - Fields: ${Object.keys(Service.schema.paths).length}`);
    
    // Test 4: Booking Model
    console.log('✓ Booking model imported');
    console.log(`  - Fields: ${Object.keys(Booking.schema.paths).length}`);
    console.log(`  - Has status history: ${!!Booking.schema.paths.statusHistory}`);
    
    // Test 5: BookingHold Model (CRITICAL)
    console.log('✓ BookingHold model imported');
    console.log(`  - Fields: ${Object.keys(BookingHold.schema.paths).length}`);
    const holdIndexes = BookingHold.schema.indexes();
    console.log(`  - Indexes: ${holdIndexes.length}`);
    const uniqueIndex = holdIndexes.find(idx => idx[1]?.unique && idx[1]?.name === 'prevent_overlapping_holds');
    console.log(`  - Has atomic conflict prevention: ${!!uniqueIndex}`);
    
    // Test 6: Review Model
    console.log('✓ Review model imported');
    console.log(`  - Fields: ${Object.keys(Review.schema.paths).length}`);
    
    console.log('\n✅ All models loaded successfully!\n');
    
    // Test database operations
    console.log('🔍 Testing Database Operations\n');
    
    // Count existing documents
    const userCount = await User.countDocuments();
    const expertCount = await Expert.countDocuments();
    const serviceCount = await Service.countDocuments();
    const bookingCount = await Booking.countDocuments();
    
    console.log(`Users: ${userCount}`);
    console.log(`Experts: ${expertCount}`);
    console.log(`Services: ${serviceCount}`);
    console.log(`Bookings: ${bookingCount}`);
    
    console.log('\n✅ Database connection working!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Model test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testModels();
