import { Migration } from './migration-runner';
import mongoose from 'mongoose';

export default class AddIndexes extends Migration {
  name = '001-add-indexes';
  description = 'Add performance indexes to all collections';

  async up() {
    await this.transaction(async () => {
      // Users collection
      const Users = mongoose.connection.collection('users');
      await Users.createIndex({ role: 1, isActive: 1 });
      await Users.createIndex({ createdAt: -1 });

      // Courses collection
      const Courses = mongoose.connection.collection('courses');
      await Courses.createIndex({ teacherId: 1 });
      await Courses.createIndex({ status: 1, startDate: 1 });
      await Courses.createIndex({ 'metadata.tags': 1 });

      // Enrollments collection - indexes handled by schemas

      // News collection
      const News = mongoose.connection.collection('news');
      await News.createIndex({ publishedAt: -1 });
      await News.createIndex({ category: 1, publishedAt: -1 });
      await News.createIndex({ tags: 1 });
      await News.createIndex({ 'author.id': 1 });

      // Events collection
      const Events = mongoose.connection.collection('events');
      await Events.createIndex({ startDate: 1, endDate: 1 });
      await Events.createIndex({ type: 1, startDate: 1 });
      await Events.createIndex({ 'participants.userId': 1 });
      await Events.createIndex({ location: 1 });
    });
  }

  async down() {
    await this.transaction(async () => {
      // Drop all non-unique indexes
      const collections = ['users', 'courses', 'enrollments', 'news', 'events'];

      for (const collectionName of collections) {
        const collection = mongoose.connection.collection(collectionName);
        const indexes = await collection.indexes();

        for (const index of indexes) {
          if (index.name !== '_id_' && !index.unique && index.name) {
            await collection.dropIndex(index.name);
          }
        }
      }
    });
  }
}
