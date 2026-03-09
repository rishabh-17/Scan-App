import React from 'react';
import Modal from './Modal';
import Button from './Button';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  loading = false 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={!loading ? onClose : undefined} title={title}>
      <p className="text-sm text-gray-500 mb-6">
        {message}
      </p>
      <div className="flex justify-end gap-3">
        <Button 
          variant="secondary" 
          onClick={onClose} 
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button 
          variant={confirmVariant} 
          onClick={onConfirm} 
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
