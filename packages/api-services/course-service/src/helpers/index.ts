// Path: packages/api-services/course-service/src/helpers/index.ts

export const ValidationHelper = {
  validateSchema: (schema: any, data: any) => {
    // Basic validation - in production would use actual validation
    if (!data.title || !data.description || !data.code) {
      return { success: false, errors: ['Required fields missing'] };
    }
    return { success: true };
  }
};

export const ErrorHelper = {
  handleServiceError: (message: string, error: any) => ({
    success: false as const,
    error: `${message}: ${error.message || 'Unknown error'}`
  })
};