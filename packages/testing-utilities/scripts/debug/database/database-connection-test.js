#!/usr/bin/env node

/**
 * Simple database debug script
 */

const mongoose = require('mongoose');

async function checkDatabase() {
  const configs = [
    'mongodb://localhost:27017/yggdrasil_test_w0',
    'mongodb://localhost:27018/yggdrasil_test_w0',
    'mongodb://localhost:27017/yggdrasil-dev',
    'mongodb://localhost:27018/yggdrasil-dev'
  ];
  
  for (const uri of configs) {
    try {
      console.log(`\n🔗 Trying: ${uri}`);
      
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
        socketTimeoutMS: 2000,
      });
      
      console.log('✅ Connected successfully!');
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📚 Collections: ${collections.map(c => c.name).join(', ')}`);
      
      // Check for users in different collections
      for (const collName of ['users', 'w0_users']) {
        try {
          const coll = mongoose.connection.db.collection(collName);
          const count = await coll.countDocuments();
          console.log(`👥 ${collName}: ${count} documents`);
          
          if (count > 0) {
            const users = await coll.find({}).limit(3).toArray();
            users.forEach(user => {
              console.log(`  - ${user.email || user._id} (${user.role || 'unknown'})`);
            });
          }
        } catch (e) {
          // Collection might not exist
        }
      }
      
      await mongoose.disconnect();
      return; // Success, stop trying other configs
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      try {
        await mongoose.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
  }
  
  console.log('\n❌ Could not connect to any database configuration');
}

checkDatabase();