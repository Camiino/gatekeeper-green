import { OrderStatus } from '@/types';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: OrderStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={status === 'Completed' ? 'default' : 'secondary'}>
      {status}
    </Badge>
  );
}