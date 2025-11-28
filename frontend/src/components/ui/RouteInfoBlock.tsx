'use client';

import { useState, useEffect, useCallback } from 'react';

// Временные заглушки для иконок
const ExternalLink = ({ className }: { className?: string }) => <span className={className}>🔗</span>;
const X = ({ className }: { className?: string }) => <span className={className}>✕</span>;
const ChevronDown = ({ className }: { className?: string }) => <span className={className}>▼</span>;
const ChevronUp = ({ className }: { className?: string }) => <span className={className}>▲</span>;
const Loader2 = ({ className }: { className?: string }) => <span className={`animate-spin ${className}`}>⟳</span>;
const AlertCircle = ({ className }: { className?: string }) => <span className={className}>⚠️</span>;
const MapPin = ({ className }: { className?: string }) => <span className={className}>📍</span>;
const Calendar = ({ className }: { className?: string }) => <span className={className}>📅</span>;
const Tag = ({ className }: { className?: string }) => <span className={className}>🏷️</span>;
const TrendingUp = ({ className }: { className?: string }) => <span className={className}>📈</span>;

interface ContentBlock {
  id: string;
  type: 'advertisement' | 'recommendation' | 'promotion' | 'weather' | 'news' | 'destination' | 'service';
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  priority: number;
  targetAudience: 'all' | 'mobile' | 'desktop';
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface RouteInfoBlockProps {
  routeId?: string;
  className?: string;
  maxItems?: number;
  collapsible?: boolean;
}

const blockTypeConfig = {
  advertisement: {
    icon: TrendingUp,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    titleColor: 'text-blue-900',
    tagColor: 'bg-blue-100 text-blue-800'
  },
  recommendation: {
    icon: MapPin,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    titleColor: 'text-green-900',
    tagColor: 'bg-green-100 text-green-800'
  },
  promotion: {
    icon: Tag,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    titleColor: 'text-orange-900',
    tagColor: 'bg-orange-100 text-orange-800'
  },
  weather: {
    icon: Calendar,
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    titleColor: 'text-cyan-900',
    tagColor: 'bg-cyan-100 text-cyan-800'
  },
  news: {
    icon: Calendar,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    titleColor: 'text-purple-900',
    tagColor: 'bg-purple-100 text-purple-800'
  },
  destination: {
    icon: MapPin,
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    titleColor: 'text-indigo-900',
    tagColor: 'bg-indigo-100 text-indigo-800'
  },
  service: {
    icon: Tag,
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    titleColor: 'text-pink-900',
    tagColor: 'bg-pink-100 text-pink-800'
  }
};

export function RouteInfoBlock({
  routeId,
  className = '',
  maxItems = 6,
  collapsible = true
}: RouteInfoBlockProps) {
  const [content, setContent] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');

  // Detect device type
  useEffect(() => {
    const checkDevice = () => {
      setDevice(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Fetch content
  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        device,
        limit: maxItems.toString(),
        ...(routeId && { routeId })
      });

      const response = await fetch(`/api/v1/content/route-sidebar?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();
      setContent(data.data.content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch content:', err);
    } finally {
      setLoading(false);
    }
  }, [device, routeId, maxItems]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleDismiss = useCallback((blockId: string) => {
    setContent(prev => prev.filter(block => block.id !== blockId));
  }, []);

  const handleRefresh = useCallback(() => {
    fetchContent();
  }, [fetchContent]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-light p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-600">Загрузка рекомендаций...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-light p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">Не удалось загрузить рекомендации</span>
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border border-light ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-light">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Рекомендации</h3>
          <span className="text-sm text-gray-500">({content.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Обновить"
          >
            <Loader2 className="h-4 w-4 text-gray-500" />
          </button>

          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={isCollapsed ? "Развернуть" : "Свернуть"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="divide-y divide-light">
          {content.slice(0, maxItems).map((block) => {
            const config = blockTypeConfig[block.type];
            const Icon = config.icon;

            return (
              <div key={block.id} className={`p-4 ${config.bgColor}`}>
                <div className="flex gap-4">
                  {/* Image */}
                  {block.imageUrl && (
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={block.imageUrl}
                        alt={block.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <Icon className="h-4 w-4 mt-0.5 text-gray-500" />
                      <h4 className={`font-semibold ${config.titleColor} truncate flex-1`}>
                        {block.title}
                      </h4>

                      <button
                        onClick={() => handleDismiss(block.id)}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Скрыть"
                      >
                        <X className="h-3 w-3 text-gray-400" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {block.content}
                    </p>

                    {/* Tags */}
                    {block.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {block.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className={`text-xs px-2 py-1 rounded-full ${config.tagColor}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {block.tags.length > 2 && (
                          <span className="text-xs text-gray-500">+{block.tags.length - 2}</span>
                        )}
                      </div>
                    )}

                    {/* Action */}
                    {block.linkUrl && (
                      <a
                        href={block.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-sm font-medium ${config.titleColor} hover:opacity-80 transition-opacity`}
                      >
                        {block.linkText || 'Подробнее'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {!isCollapsed && content.length > maxItems && (
        <div className="p-4 border-t border-light">
          <button className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Показать еще ({content.length - maxItems} рекомендаций)
          </button>
        </div>
      )}
    </div>
  );
}