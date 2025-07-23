'use client';

import React, { useState } from 'react';
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserCircleIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface EnhancedHeaderProps {
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
}

export default function EnhancedHeader({ 
  title = "HR Assistant Pro", 
  subtitle = "Streamline Your Hiring with AI-Powered Resume Evaluation",
  showNavigation = true 
}: EnhancedHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', href: '#', icon: DocumentTextIcon },
    { name: 'Settings', href: '#', icon: Cog6ToothIcon },
    { name: 'Help', href: '#', icon: QuestionMarkCircleIcon },
  ];

  return (
    <header className="bg-white shadow-soft border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-rush-green to-rush-green-dark rounded-xl flex items-center justify-center shadow-medium">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-gradient">{title}</h1>
              <p className="text-sm text-neutral-gray-dark">{subtitle}</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          {showNavigation && (
            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 text-neutral-gray-dark hover:text-rush-green transition-colors duration-200 group"
                >
                  <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">{item.name}</span>
                </a>
              ))}
              
              {/* User Profile */}
              <div className="flex items-center space-x-3 pl-6 border-l border-gray-200">
                <button className="flex items-center space-x-2 text-neutral-gray-dark hover:text-rush-green transition-colors duration-200 group">
                  <UserCircleIcon className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium hidden lg:block">Profile</span>
                </button>
              </div>
            </nav>
          )}

          {/* Mobile menu button */}
          {showNavigation && (
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-neutral-gray-dark hover:text-rush-green hover:bg-gray-100 transition-colors duration-200"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Navigation */}
        {showNavigation && isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 slide-in-left">
            <div className="space-y-4">
              {navigationItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-3 px-4 py-3 text-neutral-gray-dark hover:text-rush-green hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </a>
              ))}
              
              {/* Mobile User Profile */}
              <div className="border-t border-gray-200 pt-4">
                <button className="flex items-center space-x-3 px-4 py-3 w-full text-neutral-gray-dark hover:text-rush-green hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <UserCircleIcon className="h-6 w-6" />
                  <span className="font-medium">Profile</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress indicator for evaluation */}
      <div className="h-1 bg-gradient-to-r from-rush-green to-rush-blue opacity-0 transition-opacity duration-300" id="progress-bar">
        <div className="h-full bg-white/20 animate-pulse"></div>
      </div>
    </header>
  );
} 