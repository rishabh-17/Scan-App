import React from 'react';
import Modal from './Modal';
import Button from './Button';

const AlertModal = ({ 
  isOpen, 
  onClose, 
  title = 'Alert', 
  message, 
  buttonText = 'OK',
  variant = 'primary'
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-gray-500 mb-6">
        {message}
      </p>
      <div className="flex justify-end">
        <Button 
          variant={variant} 
          onClick={onClose}
        >
          {buttonText}
        </Button>
      </div>
    </Modal>
  );
};

export default AlertModal;
