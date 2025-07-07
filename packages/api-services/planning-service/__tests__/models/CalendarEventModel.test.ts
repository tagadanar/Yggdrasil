import { CalendarEventModel } from '../../src/models/CalendarEvent';
import { DatabaseConnection } from '../../../../database-schemas/src';

describe('CalendarEventModel', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-dev?authSource=admin';
    await DatabaseConnection.connect(mongoUri);
  });

  afterAll(async () => {
    await CalendarEventModel.deleteMany({});
    await DatabaseConnection.disconnect();
  });

  it('should have insertMany method available', () => {
    expect(CalendarEventModel.insertMany).toBeDefined();
    expect(typeof CalendarEventModel.insertMany).toBe('function');
  });

  it('should have populate method available on queries', async () => {
    const event = await CalendarEventModel.create({
      title: 'Test Event',
      startDate: new Date(),
      endDate: new Date(Date.now() + 3600000),
      type: 'meeting',
      category: 'academic',
      organizer: 'test-user-id'
    });

    const query = CalendarEventModel.findById(event._id);
    expect(query.populate).toBeDefined();
    expect(typeof query.populate).toBe('function');
  });

  it('should have static methods like findByDateRange', () => {
    expect(CalendarEventModel.findByDateRange).toBeDefined();
    expect(typeof CalendarEventModel.findByDateRange).toBe('function');
  });

  it('should have deleteMany method available', () => {
    expect(CalendarEventModel.deleteMany).toBeDefined();
    expect(typeof CalendarEventModel.deleteMany).toBe('function');
  });

  it('should create an event with proper instance methods', async () => {
    const event = await CalendarEventModel.create({
      title: 'Test Event',
      startDate: new Date(),
      endDate: new Date(Date.now() + 3600000),
      type: 'meeting',
      category: 'academic',
      organizer: 'test-user-id'
    });

    expect(event.canUserEdit).toBeDefined();
    expect(event.canUserView).toBeDefined();
    expect(event.isUserAttending).toBeDefined();
    expect(event.addAttendee).toBeDefined();
    expect(event.removeAttendee).toBeDefined();
  });
});