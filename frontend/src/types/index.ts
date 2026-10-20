export interface Endpoint {
  id: number;
  user_id: number;
  name: string;
  url: string;
  method: string;
  headers: string | null;
  body: string | null;
  expected_status: number;
  check_interval: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EndpointCreate {
  name: string;
  url: string;
  method?: string;
  headers?: string;
  body?: string;
  expected_status?: number;
  check_interval?: number;
}

export interface MonitoringResult {
  id: number;
  endpoint_id: number;
  status: 'success' | 'failure';
  status_code: number | null;
  response_time: number | null;
  error_message: string | null;
  checked_at: string;
}

export interface Incident {
  id: number;
  endpoint_id: number;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}
