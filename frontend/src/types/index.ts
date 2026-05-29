export type Role = 'OWNER' | 'MANAGER' | 'KITCHEN' | 'FLOOR';
export type Position = 'KITCHEN' | 'BAR' | 'WAIT' | 'MANAGEMENT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  position: Position;
  phone?: string;
  isActive?: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  KITCHEN: 'Kitchen',
  FLOOR: 'Floor staff',
};

export const POSITION_LABELS: Record<Position, string> = {
  KITCHEN: 'Kitchen',
  BAR: 'Bar',
  WAIT: 'Waitstaff',
  MANAGEMENT: 'Management',
};
