import React from 'react';
import { Spin } from 'antd';

const Loader = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'small',
    md: 'default',
    lg: 'default',
    xl: 'large'
  };

  return (
    <Spin size={sizes[size]} className={className} />
  );
};

export default Loader;
