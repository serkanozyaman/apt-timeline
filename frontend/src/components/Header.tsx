import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-black text-white p-4 shadow-lg border-b border-gray-800">
      <div className="flex items-center space-x-3">
        <img src="/medium-logo.png" alt="YILDIZ Logo" className="w-10 h-10 object-contain" />
        <h1 className="text-2xl font-semibold tracking-wide">
          YILDIZ Cyber Threat Intelligence
        </h1>
      </div>
    </header>
  );
};

export default Header;