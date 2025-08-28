import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  id: string;
  name: string;
  icon: LucideIcon;
  gradient: string;
  href: string;
  onClick?: () => void;
  className?: string;
}

export function CategoryCard({ 
  id, 
  name, 
  icon: IconComponent, 
  gradient, 
  href, 
  onClick, 
  className 
}: CategoryCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = href;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn("text-center group cursor-pointer", className)}
      data-testid={`category-card-${id}`}
    >
      <div 
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:scale-105 transition-transform",
          gradient
        )}
      >
        <IconComponent className="h-6 w-6 text-white" />
      </div>
      <span 
        className="text-sm font-medium text-center block"
        data-testid={`category-name-${id}`}
      >
        {name}
      </span>
    </div>
  );
}
