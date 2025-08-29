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
  color = 'blue' 
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
    </div>
  );
}