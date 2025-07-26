import { expectType, expectError, expectAssignable, expectNotAssignable } from 'tsd';
import { 
  UserId, 
  Email, 
  JWT,
  HashedPassword,
  PlainPassword,
  RequestId,
  NodeEnvironment,
  LogLevel,
  UserRole,
  isUserId, 
  isEmail,
  isJWT,
  isNodeEnvironment,
  isLogLevel,
  isUserRole,
  assertIsUserId,
  // assertIsEmail, // Unused import
  // assertIsUserRole, // Unused import
  StrictRequest,
  ApiResponse,
  StrictJWTPayload,
  ValidationResult,
  ServiceResult,
  StrictPaginatedResult,
  HttpStatusCode,
  Brand,
  Nullable,
  Optional,
  Maybe,
  StrictOmit,
  StrictPartial
} from '../strict';

// Test branded types
declare const userId: UserId;
declare const email: Email;
declare const jwt: JWT;
declare const hashedPassword: HashedPassword;
declare const plainPassword: PlainPassword;
declare const requestId: RequestId;

// Branded types should not be assignable to their base types without casting
expectNotAssignable<string>(userId);
expectNotAssignable<string>(email);
expectNotAssignable<string>(jwt);

// But base types should be assignable with proper type guards
const maybeUserId = '507f1f77bcf86cd799439011';
if (isUserId(maybeUserId)) {
  expectType<UserId>(maybeUserId);
}

const maybeEmail = 'test@example.com';
if (isEmail(maybeEmail)) {
  expectType<Email>(maybeEmail);
}

const maybeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
if (isJWT(maybeJWT)) {
  expectType<JWT>(maybeJWT);
}

// Test environment types
const nodeEnv: NodeEnvironment = 'development';
expectType<'development' | 'test' | 'production'>(nodeEnv);

const logLevel: LogLevel = 'info';
expectType<'error' | 'warn' | 'info' | 'http' | 'debug' | 'trace'>(logLevel);

// Test user role types
const userRole: UserRole = 'admin';
expectType<'admin' | 'staff' | 'teacher' | 'student'>(userRole);

// Test type guards
expectType<boolean>(isUserId('test'));
expectType<boolean>(isEmail('test'));
expectType<boolean>(isJWT('test'));
expectType<boolean>(isNodeEnvironment('test'));
expectType<boolean>(isLogLevel('test'));
expectType<boolean>(isUserRole('test'));

// Test assertion functions
declare const unknownString: string;
expectError(assertIsUserId('invalid'));
assertIsUserId('507f1f77bcf86cd799439011');
expectType<UserId>('507f1f77bcf86cd799439011' as UserId);

// Test request types
type LoginRequest = StrictRequest<
  {}, // no params
  {}, // no query
  { email: string; password: string },
  { id: UserId; email: Email; role: UserRole }
>;

declare const loginReq: LoginRequest;
expectType<{ email: string; password: string }>(loginReq.body);
expectType<{ id: UserId; email: Email; role: UserRole } | undefined>(loginReq.user);
expectType<RequestId>(loginReq.id);

// Test API response types
type UserApiResponse = ApiResponse<{
  user: { id: UserId; email: Email; role: UserRole };
  tokens: { accessToken: JWT; refreshToken: JWT };
}>;

declare const userResponse: UserApiResponse;
expectType<boolean>(userResponse.success);
if (userResponse.data) {
  expectType<UserId>(userResponse.data.user.id);
  expectType<Email>(userResponse.data.user.email);
  expectType<UserRole>(userResponse.data.user.role);
  expectType<JWT>(userResponse.data.tokens.accessToken);
  expectType<JWT>(userResponse.data.tokens.refreshToken);
}

// Test JWT payload type
declare const jwtPayload: StrictJWTPayload;
expectType<UserId>(jwtPayload._id);
expectType<Email>(jwtPayload.email);
expectType<UserRole>(jwtPayload.role);
expectType<number>(jwtPayload.tokenVersion);
expectType<number | undefined>(jwtPayload.iat);
expectType<number | undefined>(jwtPayload.exp);

// Test validation result types
declare const validationResult: ValidationResult<{ name: string }>;
expectType<boolean>(validationResult.success);
if (validationResult.data) {
  expectType<{ name: string }>(validationResult.data);
}
if (validationResult.errors) {
  expectType<Array<{ field: string; message: string; value?: unknown }>>(validationResult.errors);
}

// Test service result types
declare const serviceResult: ServiceResult<string>;
expectType<boolean>(serviceResult.success);
expectType<string | undefined>(serviceResult.data);
expectType<string | undefined>(serviceResult.error);
expectType<string | undefined>(serviceResult.code);

// Test pagination types
declare const paginatedResult: StrictPaginatedResult<{ id: UserId; name: string }>;
expectType<Array<{ id: UserId; name: string }>>(paginatedResult.data);
expectType<number>(paginatedResult.pagination.page);
expectType<number>(paginatedResult.pagination.limit);
expectType<number>(paginatedResult.pagination.total);
expectType<number>(paginatedResult.pagination.totalPages);
expectType<boolean>(paginatedResult.pagination.hasNextPage);
expectType<boolean>(paginatedResult.pagination.hasPrevPage);

// Test HTTP status codes
declare const statusCode: HttpStatusCode;
expectAssignable<200 | 201 | 204 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503>(statusCode);

// Test utility types
type TestBrand = Brand<string, 'Test'>;
declare const brandedValue: TestBrand;
expectNotAssignable<string>(brandedValue);

type TestNullable = Nullable<string>;
declare const nullableValue: TestNullable;
expectType<string | null>(nullableValue);

type TestOptional = Optional<string>;
declare const optionalValue: TestOptional;
expectType<string | undefined>(optionalValue);

type TestMaybe = Maybe<string>;
declare const maybeValue: TestMaybe;
expectType<string | null | undefined>(maybeValue);

// Test object utility types
interface TestInterface {
  a: string;
  b: number;
  c: boolean;
}

type TestOmit = StrictOmit<TestInterface, 'a'>;
declare const omittedValue: TestOmit;
expectType<{ b: number; c: boolean }>(omittedValue);
// expectError(omittedValue.a); // Property 'a' doesn't exist - this is the expected behavior

type TestPartial = StrictPartial<TestInterface>;
declare const partialValue: TestPartial;
expectType<{ a?: string | undefined; b?: number | undefined; c?: boolean | undefined }>(partialValue);

// Test function type constraints
import { AsyncFunction, ErrorHandler, RequestHandler } from '../strict';

declare const asyncFn: AsyncFunction<[string, number], boolean>;
expectType<(arg0: string, arg1: number) => Promise<boolean>>(asyncFn);

declare const errorHandler: ErrorHandler<Error>;
expectType<(error: Error) => void | Promise<void>>(errorHandler);

declare const requestHandler: RequestHandler<any, any>;
expectType<(req: any, res: any) => void | Promise<void>>(requestHandler);