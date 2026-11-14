#!/usr/bin/env node
import mongoose from 'mongoose';

const uri = 'mongodb://localhost:27017/experthub';

mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
.then(async () => {
  try {
    const admin = mongoose.connection.getClient().db('admin');
    const status = await admin.admin().replSetGetStatus();
    
    console.log('Replica Set Status:');
    console.log(JSON.stringify(status, null, 2));
    
  } catch (e) {
    console.log('Error getting replica set status:');
    console.log(e.message);
    console.log('\nTrying rs.status() command...');
    
    const admin = mongoose.connection.getClient().db('admin');
    try {
      const result = await admin.command({ replSetGetStatus: 1 });
      console.log(JSON.stringify(result, null, 2));
    } catch (e2) {
      console.log('Also failed:', e2.message);
    }
  }
  
  await mongoose.connection.close();
})
.catch(err => {
  console.log('Connection failed:', err.message);
  process.exit(1);
});
