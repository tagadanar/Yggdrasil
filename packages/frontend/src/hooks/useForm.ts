// packages/frontend/src/hooks/useForm.ts
// Enhanced form hook to replace 50+ form state patterns

import { useState, useCallback, useRef } from 'react';
import { useErrorHandler } from '@/lib/errors/useErrorHandler';
import { createComponentLogger } from '@/lib/errors/logger';

interface FormField {
  value: any;
  error?: string;
  touched?: boolean;
}

interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

interface UseFormOptions<T> {
  validate?: (data: T) => Partial<Record<keyof T, string>>;
  onSubmit?: (data: T) => Promise<void>;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  component?: string;
  resetOnSubmit?: boolean; // Reset form after successful submit (default: false)
  validateOnChange?: boolean; // Validate on every change (default: false)
  validateOnBlur?: boolean; // Validate on field blur (default: true)
}

interface UseFormReturn<T> {
  // Data
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  
  // States
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  
  // Actions
  setData: (data: T | ((prev: T) => T)) => void;
  setValue: (field: keyof T, value: any) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  clearErrors: () => void;
  setTouched: (field: keyof T, touched?: boolean) => void;
  
  // Form actions
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: (newData?: T) => void;
  validate: () => boolean;
  
  // Field helpers
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
    error?: string;
    touched?: boolean;
  };
  
  // Convenience methods
  register: (field: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
    name: string;
  };
}

const logger = createComponentLogger('useForm');

export function useForm<T extends Record<string, any>>(
  initialData: T,
  options: UseFormOptions<T> = {}
): UseFormReturn<T> {
  const {
    validate,
    onSubmit,
    onSuccess,
    onError,
    component = 'Form',
    resetOnSubmit = false,
    validateOnChange = false,
    validateOnBlur = true,
  } = options;

  const [state, setState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    touched: {},
    isSubmitting: false,
    isDirty: false,
    isValid: true,
  });

  const initialDataRef = useRef(initialData);
  const { handleError } = useErrorHandler({
    component,
    onError,
  });

  // Update initial data ref when initialData changes
  if (JSON.stringify(initialDataRef.current) !== JSON.stringify(initialData)) {
    initialDataRef.current = initialData;
  }

  const validateForm = useCallback((data: T): Partial<Record<keyof T, string>> => {
    if (!options.validate) return {};
    
    try {
      return options.validate(data) || {};
    } catch (error) {
      logger.error('Form validation failed', { component, error });
      return {};
    }
  }, [options.validate, component]);

  const updateValidation = useCallback((newData: T) => {
    const errors = validateForm(newData);
    const isValid = Object.keys(errors).length === 0;
    
    setState(prev => ({
      ...prev,
      errors,
      isValid,
    }));
    
    return isValid;
  }, [validateForm]);

  const setData = useCallback((dataOrUpdater: T | ((prev: T) => T)) => {
    setState(prev => {
      const newData = typeof dataOrUpdater === 'function' 
        ? dataOrUpdater(prev.data)
        : dataOrUpdater;
      
      const isDirty = JSON.stringify(newData) !== JSON.stringify(initialDataRef.current);
      
      return {
        ...prev,
        data: newData,
        isDirty,
      };
    });
    
    // Validate on change if enabled
    if (validateOnChange) {
      const newData = typeof dataOrUpdater === 'function' 
        ? dataOrUpdater(state.data)
        : dataOrUpdater;
      updateValidation(newData);
    }
  }, [validateOnChange, updateValidation, state.data]);

  const setValue = useCallback((field: keyof T, value: any) => {
    setData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, [setData]);

  const setError = useCallback((field: keyof T, error: string) => {
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: error,
      },
      isValid: false,
    }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[field];
      
      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, []);

  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {},
      isValid: true,
    }));
  }, []);

  const setTouched = useCallback((field: keyof T, touched = true) => {
    setState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: touched,
      },
    }));
  }, []);

  const validateCurrentData = useCallback((): boolean => {
    return updateValidation(state.data);
  }, [updateValidation, state.data]);

  const reset = useCallback((newData?: T) => {
    const resetData = newData || initialDataRef.current;
    
    logger.debug('Resetting form', { component });
    
    setState({
      data: resetData,
      errors: {},
      touched: {},
      isSubmitting: false,
      isDirty: false,
      isValid: true,
    });
    
    if (newData) {
      initialDataRef.current = newData;
    }
  }, [component]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!onSubmit) {
      logger.warn('Form submitted but no onSubmit handler provided', { component });
      return;
    }

    logger.debug('Form submission started', { component });
    
    // Validate form
    const isValidForm = validateCurrentData();
    if (!isValidForm) {
      logger.warn('Form validation failed on submit', { component, errors: state.errors });
      return;
    }

    try {
      setState(prev => ({ ...prev, isSubmitting: true }));
      
      await onSubmit(state.data);
      
      logger.debug('Form submission successful', { component });
      onSuccess?.(state.data);
      
      if (resetOnSubmit) {
        reset();
      }
      
    } catch (error: any) {
      logger.error('Form submission failed', { component, error: error.message });
      
      const appError = handleError(error, { component, action: 'submitForm' });
      
      // If the error contains field-specific errors, set them
      if (error.response?.data?.fieldErrors) {
        const fieldErrors = error.response.data.fieldErrors;
        setState(prev => ({
          ...prev,
          errors: { ...prev.errors, ...fieldErrors },
          isValid: false,
        }));
      }
      
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [onSubmit, component, updateValidation, state.data, state.errors, onSuccess, resetOnSubmit, reset, handleError]);

  const getFieldProps = useCallback((field: keyof T) => {
    return {
      value: state.data[field] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setValue(field, e.target.value);
        setTouched(field, true);
      },
      onBlur: () => {
        setTouched(field, true);
        if (validateOnBlur) {
          updateValidation(state.data);
        }
      },
      error: state.errors[field],
      touched: state.touched[field],
    };
  }, [state.data, state.errors, state.touched, setValue, setTouched, validateOnBlur, updateValidation]);

  const register = useCallback((field: keyof T) => {
    const fieldProps = getFieldProps(field);
    return {
      ...fieldProps,
      name: String(field),
    };
  }, [getFieldProps]);

  return {
    // Data
    data: state.data,
    errors: state.errors,
    touched: state.touched,
    
    // States
    isSubmitting: state.isSubmitting,
    isDirty: state.isDirty,
    isValid: state.isValid,
    
    // Actions
    setData,
    setValue,
    setError,
    clearError,
    clearErrors,
    setTouched,
    
    // Form actions
    handleSubmit,
    reset,
    validate: validateCurrentData,
    
    // Field helpers
    getFieldProps,
    register,
  };
}

// Convenience hook for simple forms without complex validation
export function useSimpleForm<T extends Record<string, any>>(
  initialData: T,
  onSubmit: (data: T) => Promise<void>
) {
  return useForm(initialData, {
    onSubmit,
    validateOnBlur: false,
    validateOnChange: false,
  });
}