import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#365f60' 
}) => {
  const sizeMap = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };
  
  const spinnerSize = sizeMap[size];
  
  return (
    <div className="flex items-center justify-center">
      <div 
        className={`${spinnerSize} animate-spin rounded-full border-4 border-t-transparent`}
        style={{ 
          borderColor: `${color}33`,
          borderTopColor: 'transparent', 
          borderRightColor: color,
          borderBottomColor: color
        }}
      />
    </div>
  );
};

export default LoadingSpinner;


