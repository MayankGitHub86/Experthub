import mongoose from 'mongoose';

async function checkStatus() {
  try {
    const db = mongoose.connection.getClient().db('admin');
    const result = await db.admin().command({ replSetGetStatus: 1 });
    console.log('Replica Set Status:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ERROR - Not a replica set:', error.message);
    console.log('\nAttempting to initialize as single-node replica set...');
    
    const db = mongoose.connection.getClient().db('admin');
    try {
      const initResult = await db.admin().command({ 
        replSetInitiate: {
          _id: 'rs0',
          members: [
            { _id: 0, host: 'localhost:27017' }
          ]
        }
      });
      console.log('Replica set initialized:');
      console.log(JSON.stringify(initResult, null, 2));
    } catch (initError) {
      console.error('Initialization error:', initError.message);
    }
  }
  
  process.exit(0);
}

async function main() {
  try {
    await mongoose.connect('mongodb://localhost:27017/experthub');
    console.log('Connected to MongoDB');
    await checkStatus();
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }
}

main();
