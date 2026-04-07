import React from 'react';
import { Modal as AntModal } from 'antd';

const widthFromMaxWidth = (maxWidth) => {
  const v = String(maxWidth || '');
  if (v.includes('max-w-xl')) return 820;
  if (v.includes('max-w-lg')) return 720;
  return 520;
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  return (
    <AntModal
      open={isOpen}
      title={title}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={widthFromMaxWidth(maxWidth)}
    >
      {children}
    </AntModal>
  );
};

export default Modal;
