import React from 'react';
import { Button as AntButton } from 'antd';

const Button = ({
  children,
  loading = false,
  disabled = false,
  variant = 'primary',
  className = '',
  onClick,
  type = 'button',
  style,
  ...props
}) => {
  const antdType = variant === 'secondary' ? 'default' : 'primary';
  const danger = variant === 'danger';
  const successStyle = variant === 'success' ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined;

  return (
    <AntButton
      type={antdType}
      danger={danger}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      htmlType={type}
      className={className}
      style={{ ...(style || {}), ...(successStyle || {}) }}
      {...props}
    >
      {children}
    </AntButton>
  );
};

export default Button;
