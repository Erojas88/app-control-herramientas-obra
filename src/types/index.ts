export type UserRole = 'solicitante' | 'jefe_obra' | 'admin';

export type ToolStatus = 'available' | 'loaned' | 'maintenance' | 'out_of_service';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type Tool = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: ToolStatus;
  photoUrl?: string;
  photoLabel?: string;
  observations: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserProfile = {
  uid: string;
  fullName: string;
  role: UserRole;
  company: string;
  position: string;
  projectId?: string;
  projectName?: string;
  email: string;
  phone?: string;
  active?: boolean;
  createdAt?: string;
};

export type ToolRequestItem = {
  id: string;
  requestId: string;
  toolId: string;
  toolName: string;
  quantity: number;
  purpose: string;
  workArea: string;
  dueDate: string;
  training: 'yes' | 'no' | 'n/a';
  condition: 'Excellent' | 'Good' | 'Regular' | 'Damaged';
  approvalStatus: ApprovalStatus;
  approvalComment?: string;
  approverName?: string;
  notes?: string;
  photoUrls?: string[];
  createdAt?: string;
  approvedAt?: string;
};

export type ToolRequest = {
  id: string;
  requesterUid: string;
  requesterName: string;
  role: string;
  company: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt?: string;
  status: RequestStatus;
  items: ToolRequestItem[];
  observations?: string;
  approverName?: string;
};

export type NotificationItem = {
  id: string;
  recipientUid: string;
  title: string;
  body: string;
  type: 'request_created' | 'request_approved' | 'request_rejected' | 'delivery_registered' | 'return_registered' | 'damage_reported';
  read: boolean;
  createdAt: string;
  requestId?: string;
  toolId?: string;
};

export type ToolDelivery = {
  id: string;
  requestId: string;
  requesterUid: string;
  requesterName: string;
  toolId: string;
  toolName: string;
  status: 'Excellent' | 'Good' | 'Regular' | 'Damaged';
  observations?: string;
  photos?: string[];
  createdAt: string;
};

export type ToolReturn = {
  id: string;
  requestId: string;
  requesterUid: string;
  requesterName: string;
  toolId: string;
  toolName: string;
  status: 'Excellent' | 'Good' | 'Regular' | 'Damaged';
  observations?: string;
  photos?: string[];
  reportedDamage: boolean;
  createdAt: string;
};
