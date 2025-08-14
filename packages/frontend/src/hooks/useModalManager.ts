// packages/frontend/src/hooks/useModalManager.ts
// Modal state management hook to replace 40+ modal state patterns

import { useState, useCallback, useRef, useEffect } from 'react';
import { createComponentLogger } from '@/lib/errors/logger';

interface ModalState {
  [modalName: string]: {
    isOpen: boolean;
    data?: any;
    openedAt?: Date;
  };
}

interface UseModalManagerOptions {
  component?: string;
  closeOnEscape?: boolean; // Close modals on Escape key (default: true)
  closeOnOutsideClick?: boolean; // Close modals on outside click (default: true)
  maxOpenModals?: number; // Maximum number of modals that can be open simultaneously (default: 3)
  onModalOpen?: (modalName: string, data?: any) => void;
  onModalClose?: (modalName: string) => void;
  onMaxModalsReached?: (attemptedModal: string, openModals: string[]) => void;
}

interface UseModalManagerReturn {
  // State queries
  isOpen: (modalName: string) => boolean;
  isAnyOpen: () => boolean;
  getOpenModals: () => string[];
  getModalData: (modalName: string) => any;
  
  // Actions
  open: (modalName: string, data?: any) => boolean; // Returns false if max modals reached
  close: (modalName: string) => void;
  closeAll: () => void;
  toggle: (modalName: string, data?: any) => void;
  
  // Advanced actions
  closeAllExcept: (modalName: string) => void;
  replaceModal: (closeModal: string, openModal: string, data?: any) => void;
  
  // Helpers
  createModalProps: (modalName: string) => {
    isOpen: boolean;
    onClose: () => void;
    data?: any;
  };
  
  // Context data
  modalStack: string[]; // Order of opened modals (latest first)
  totalOpen: number;
}

const logger = createComponentLogger('useModalManager');

export function useModalManager(
  initialModals: string[] = [],
  options: UseModalManagerOptions = {}
): UseModalManagerReturn {
  const {
    component = 'ModalManager',
    closeOnEscape = true,
    closeOnOutsideClick = true,
    maxOpenModals = 3,
    onModalOpen,
    onModalClose,
    onMaxModalsReached,
  } = options;

  const [modals, setModals] = useState<ModalState>(() => {
    const initial: ModalState = {};
    initialModals.forEach(modalName => {
      initial[modalName] = { isOpen: false };
    });
    return initial;
  });

  const modalStackRef = useRef<string[]>([]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalStackRef.current.length > 0) {
        const lastOpenModal = modalStackRef.current[0];
        if (lastOpenModal) {
          close(lastOpenModal);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape]);

  const isOpen = useCallback((modalName: string): boolean => {
    return modals[modalName]?.isOpen || false;
  }, [modals]);

  const isAnyOpen = useCallback((): boolean => {
    return Object.values(modals).some(modal => modal.isOpen);
  }, [modals]);

  const getOpenModals = useCallback((): string[] => {
    return Object.entries(modals)
      .filter(([_, modal]) => modal.isOpen)
      .map(([name, _]) => name);
  }, [modals]);

  const getModalData = useCallback((modalName: string): any => {
    return modals[modalName]?.data;
  }, [modals]);

  const open = useCallback((modalName: string, data?: any): boolean => {
    const openModalsCount = getOpenModals().length;
    
    if (openModalsCount >= maxOpenModals) {
      logger.warn('Maximum modals reached', { 
        component, 
        attempted: modalName, 
        maxModals: maxOpenModals,
        openModals: getOpenModals() 
      });
      
      onMaxModalsReached?.(modalName, getOpenModals());
      return false;
    }

    logger.debug('Opening modal', { component, modalName, data: !!data });

    setModals(prev => ({
      ...prev,
      [modalName]: {
        isOpen: true,
        data,
        openedAt: new Date(),
      },
    }));

    // Update modal stack
    modalStackRef.current = [modalName, ...modalStackRef.current.filter(name => name !== modalName)];

    onModalOpen?.(modalName, data);
    return true;
  }, [component, maxOpenModals, getOpenModals, onModalOpen, onMaxModalsReached]);

  const close = useCallback((modalName: string) => {
    if (!isOpen(modalName)) {
      logger.debug('Attempted to close modal that is not open', { component, modalName });
      return;
    }

    logger.debug('Closing modal', { component, modalName });

    setModals(prev => ({
      ...prev,
      [modalName]: {
        ...prev[modalName],
        isOpen: false,
        data: undefined,
      },
    }));

    // Update modal stack
    modalStackRef.current = modalStackRef.current.filter(name => name !== modalName);

    onModalClose?.(modalName);
  }, [component, isOpen, onModalClose]);

  const closeAll = useCallback(() => {
    const openModals = getOpenModals();
    
    if (openModals.length === 0) {
      return;
    }

    logger.debug('Closing all modals', { component, count: openModals.length });

    setModals(prev => {
      const updated = { ...prev };
      openModals.forEach(modalName => {
        updated[modalName] = {
          ...updated[modalName],
          isOpen: false,
          data: undefined,
        };
      });
      return updated;
    });

    // Clear modal stack
    modalStackRef.current = [];

    // Notify about each closed modal
    openModals.forEach(modalName => onModalClose?.(modalName));
  }, [component, getOpenModals, onModalClose]);

  const toggle = useCallback((modalName: string, data?: any) => {
    if (isOpen(modalName)) {
      close(modalName);
    } else {
      open(modalName, data);
    }
  }, [isOpen, open, close]);

  const closeAllExcept = useCallback((exceptModal: string) => {
    const openModals = getOpenModals().filter(name => name !== exceptModal);
    
    if (openModals.length === 0) {
      return;
    }

    logger.debug('Closing all modals except one', { 
      component, 
      except: exceptModal,
      closing: openModals 
    });

    setModals(prev => {
      const updated = { ...prev };
      openModals.forEach(modalName => {
        updated[modalName] = {
          ...updated[modalName],
          isOpen: false,
          data: undefined,
        };
      });
      return updated;
    });

    // Update modal stack
    modalStackRef.current = modalStackRef.current.filter(name => 
      name === exceptModal || !openModals.includes(name)
    );

    // Notify about each closed modal
    openModals.forEach(modalName => onModalClose?.(modalName));
  }, [component, getOpenModals, onModalClose]);

  const replaceModal = useCallback((closeModal: string, openModal: string, data?: any) => {
    logger.debug('Replacing modal', { 
      component, 
      closing: closeModal, 
      opening: openModal 
    });

    close(closeModal);
    open(openModal, data);
  }, [component, close, open]);

  const createModalProps = useCallback((modalName: string) => {
    return {
      isOpen: isOpen(modalName),
      onClose: () => close(modalName),
      data: getModalData(modalName),
    };
  }, [isOpen, close, getModalData]);

  const modalStack = modalStackRef.current;
  const totalOpen = getOpenModals().length;

  return {
    // State queries
    isOpen,
    isAnyOpen,
    getOpenModals,
    getModalData,
    
    // Actions
    open,
    close,
    closeAll,
    toggle,
    
    // Advanced actions
    closeAllExcept,
    replaceModal,
    
    // Helpers
    createModalProps,
    
    // Context data
    modalStack,
    totalOpen,
  };
}

// Convenience hook for single modal management
export function useModal(modalName: string = 'default', options: UseModalManagerOptions = {}) {
  const manager = useModalManager([modalName], options);
  
  return {
    isOpen: manager.isOpen(modalName),
    open: (data?: any) => manager.open(modalName, data),
    close: () => manager.close(modalName),
    toggle: (data?: any) => manager.toggle(modalName, data),
    data: manager.getModalData(modalName),
    modalProps: manager.createModalProps(modalName),
  };
}

// Hook for modal management with automatic cleanup
export function useManagedModal(
  modalName: string,
  options: UseModalManagerOptions & {
    autoCloseDelay?: number; // Auto-close after X ms (default: disabled)
    closeOnRouteChange?: boolean; // Close on route change (default: true)
  } = {}
) {
  const { autoCloseDelay, closeOnRouteChange = true, ...managerOptions } = options;
  const modal = useModal(modalName, managerOptions);
  
  // Auto-close timer
  useEffect(() => {
    if (!modal.isOpen || !autoCloseDelay) return;
    
    const timer = setTimeout(() => {
      modal.close();
    }, autoCloseDelay);
    
    return () => clearTimeout(timer);
  }, [modal.isOpen, autoCloseDelay, modal.close]);
  
  // Close on route change
  useEffect(() => {
    if (!closeOnRouteChange) return;
    
    return () => {
      if (modal.isOpen) {
        modal.close();
      }
    };
  }, [closeOnRouteChange, modal.isOpen, modal.close]);
  
  return modal;
}