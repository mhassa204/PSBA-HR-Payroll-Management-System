import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/sidebar.css';

// Simple SVG Icon Components
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CogIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ViewColumnsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

/**
 * Futuristic Left Sidebar Navigation
 * 
 * Features:
 * - Beautiful gradient backgrounds
 * - Glassmorphism effects
 * - Smooth animations and transitions
 * - Active state indicators with glowing effects
 * - Responsive design
 * - Modern iconography
 */

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: HomeIcon,
    description: 'Overview & Analytics',
    color: 'bg-blue-600'
  },
  { 
    name: 'Employees', 
    href: '/employees', 
    icon: UsersIcon,
    description: 'Manage Team',
    color: 'bg-emerald-600',
    children: [
      { name: 'All Employees', href: '/employees', icon: ViewColumnsIcon },
      { name: 'Add Employee', href: '/employees/create', icon: PlusIcon }
    ]
  },
  { 
    name: 'Users', 
    href: '/users', 
    icon: UserIcon,
    description: 'System Access',
    color: 'bg-purple-600',
    children: [
      { name: 'All Users', href: '/users', icon: ViewColumnsIcon },
      { name: 'Add User', href: '/users/create', icon: PlusIcon }
    ]
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: ChartBarIcon,
    description: 'Analytics',
    color: 'bg-indigo-600'
  },
  { 
    name: 'Audit Logs', 
    href: '/audit-logs', 
    icon: ShieldCheckIcon,
    description: 'Security',
    color: 'bg-yellow-600'
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: CogIcon,
    description: 'Configuration',
    color: 'bg-gray-600'
  }
];

const LeftSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState(new Set());

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const isChildActive = (children) => {
    return children?.some(child => location.pathname === child.href);
  };

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const handleNavigation = (href) => {
    navigate(href);
  };

  return (
    <div className="fixed left-0 top-0 h-full w-72 bg-slate-800 border-r border-slate-600 shadow-xl z-50">
      <div className="h-full flex flex-col">
                 {/* Logo Section */}
         <div className="p-6 border-b border-slate-600">
           <div className="flex items-center space-x-3">
             <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
               <span className="text-white font-bold text-lg">HR</span>
             </div>
             <div>
               <h1 className="text-xl font-bold text-white">
                 PSBA Portal
               </h1>
               <p className="text-sm text-slate-300">Human Resources</p>
             </div>
           </div>
         </div>

                 {/* Navigation */}
         <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isItemActive = isActive(item.href) || isChildActive(item.children);
            const isExpanded = expandedItems.has(item.name);
            
            return (
              <div key={item.name} className="space-y-1">
                {/* Main Navigation Item */}
                                 <button
                   onClick={() => {
                     if (item.children) {
                       toggleExpanded(item.name);
                     } else {
                       handleNavigation(item.href);
                     }
                   }}
                   className={`
                     group w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200
                     ${isItemActive 
                       ? item.color + ' text-white shadow-md' 
                       : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                     }
                   `}
                 >
                  <div className="flex items-center space-x-3">
                                         <div className={`
                       p-2 rounded-md transition-all duration-200
                       ${isItemActive 
                         ? 'bg-white/20 text-white' 
                         : 'text-slate-400 group-hover:text-white'
                       }
                     `}>
                       <item.icon className="w-5 h-5" />
                     </div>
                    <div className="text-left">
                      <div className="font-medium">{item.name}</div>
                      <div className={`text-xs ${isItemActive ? 'text-white/80' : 'text-slate-400'}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  
                  {item.children && (
                    <div className={`
                      transition-transform duration-300
                      ${isExpanded ? 'rotate-90' : 'rotate-0'}
                    `}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Sub-navigation */}
                {item.children && isExpanded && (
                  <div className="ml-8 space-y-1">
                    {item.children.map((child) => {
                      const isChildActive = location.pathname === child.href;
                      
                      return (
                                                 <button
                           key={child.name}
                           onClick={() => handleNavigation(child.href)}
                           className={`
                             w-full flex items-center space-x-3 p-2 rounded-md transition-all duration-200 text-left
                             ${isChildActive 
                               ? 'bg-slate-700 text-white' 
                               : 'text-slate-400 hover:text-white hover:bg-slate-700'
                             }
                           `}
                         >
                          <child.icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{child.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

                 {/* Bottom Section */}
         <div className="p-4 border-t border-slate-600">
           <div className="bg-slate-700 rounded-lg p-4">
             <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                 <UserIcon className="w-5 h-5 text-white" />
               </div>
               <div>
                 <p className="text-sm font-medium text-white">Admin User</p>
                 <p className="text-xs text-slate-300">HR Admin</p>
               </div>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
