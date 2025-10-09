import { Link } from 'react-router-dom';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'indigo' | 'red' | 'yellow';
  href?: string;
  onClick?: () => void;
}

const colorClasses = {
  blue: 'bg-blue-500 text-blue-600',
  green: 'bg-green-500 text-green-600',
  purple: 'bg-purple-500 text-purple-600',
  indigo: 'bg-indigo-500 text-indigo-600',
  red: 'bg-red-500 text-red-600',
  yellow: 'bg-yellow-500 text-yellow-600',
};

export function StatsCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  color = 'blue',
  href,
  onClick
}: StatsCardProps) {
  const isInteractive = href || onClick;
  
  const cardContent = (
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className={`p-3 rounded-lg bg-opacity-10 ${colorClasses[color].split(' ')[0]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
      <div className="ml-4 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 truncate">
              {title}
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {value}
            </p>
          </div>
          {trend && (
            <div className={`flex items-center text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="mr-1">
                {trend.isPositive ? '↗' : '↘'}
              </span>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );

  const baseClasses = "bg-white rounded-lg shadow-sm border border-gray-200 p-6 block w-full text-left";
  const interactiveClasses = isInteractive 
    ? "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
    : "";

  if (href) {
    return (
      <Link 
        to={href}
        className={`${baseClasses} ${interactiveClasses}`}
        aria-label={`Navigate to ${title.toLowerCase()} page. Current value: ${value}${description ? `. ${description}` : ''}`}
      >
        {cardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${interactiveClasses}`}
        aria-label={`${title} action. Current value: ${value}${description ? `. ${description}` : ''}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {cardContent}
    </div>
  );
}