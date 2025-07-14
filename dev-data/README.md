# Development Data

This directory contains data files used for development and testing purposes.

## Structure

### demo-accounts/
Contains demo account credentials for development and testing:
- `demo-admin.json` - Demo administrator account
- `demo-staff.json` - Demo staff account (Academic Administration)
- `demo-teacher.json` - Demo teacher account  
- `demo-student.json` - Demo student account

These accounts are automatically seeded into the development database for testing login flows and user functionality.

### test-data/
Contains test data files for manual API testing:
- `test-login.json` - Sample login request payload
- `test-registration.json` - Sample registration request payload

## Usage

These files are used by:
- Database seeding scripts during development setup
- Manual API testing with tools like Postman or curl
- Development environment initialization

## Security Note

⚠️ **These files contain demo credentials and should never be used in production!**

All demo accounts use predictable passwords and are intended only for development and testing purposes.