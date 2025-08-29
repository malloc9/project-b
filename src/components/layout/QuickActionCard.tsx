import { Link } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  color?: 'blue' | 'green' | 'purple' | 'indigo' | 'red' | 'yellow';
  external?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-500 hover:bg-blue-600 group-hover:text-blue-600',
  green: 'bg-green-500 hover:bg-green-600 group-hover:text-green-600',
  purple: 'bg-purple-500 hover:bg-purple-600 group-hover:text-purple-600',
  indigo: 'bg-indigo-500 hover:bg-indigo-600 group-hover:text-indigo-600',
  red: 'bg-red-500 hover:bg-red-600 group-hover:text-red-600',
  yellow: 'bg-yellow-500 hover:bg-yellow-600 group-hover:text-yellow-600',
};

export function QuickActionCard({ 
  title, 
  description, 
  icon, 
  href, 
  color = 'blue',
  external = false 
}: QuickActionCardProps) {
  const cardContent = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 p-6 group cursor-pointer">
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${colorClasses[color].split(' ')[0]} text-white text-2xl group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-gray-900 transition-colors duration-200 ${colorClasses[color].split(' ')[2]}`}>
            {title}
          </h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {description}
          </p>
          <div className="mt-3 flex items-center text-sm text-gray-500">
            <span>Click to access</span>
            <span className="ml-1 group-hover:translate-x-1 transition-transform duration-200">
              →
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  return (
    <Link to={href}>
      {cardContent}
    </Link>
  );
}