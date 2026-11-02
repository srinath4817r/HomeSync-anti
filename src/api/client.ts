const BASE_URL = "/api";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Send session cookies
  });

  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.error) {
        errorMsg = errorJson.error;
      }
    } catch {
      // not json
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  getAuthConfig: () => request<{ googleConfigured: boolean; googleClientId: string | null; environment: string }>("/auth/config"),
  loginGoogle: (credential: string) => request<{ user: any; token: string }>("/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),
  devLogin: (email: string, name?: string) => request<{ user: any; token: string }>("/auth/dev-login", { method: "POST", body: JSON.stringify({ email, name }) }),
  getMe: () => request<{ user: any; families: any[] }>("/auth/me"),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  updateProfile: (name: string, avatar_url?: string) => request<{ user: any }>("/auth/profile", { method: "PATCH", body: JSON.stringify({ name, avatar_url }) }),

  // Families
  createFamily: (data: any) => request<{ family: any; role: string }>("/families", { method: "POST", body: JSON.stringify(data) }),
  getFamily: (familyId: number) => request<{ family: any; members: any[]; currentRole: string }>(`/families/${familyId}`),
  updateFamily: (familyId: number, data: any) => request<{ family: any }>(`/families/${familyId}`, { method: "PATCH", body: JSON.stringify(data) }),
  createInvitation: (familyId: number, data: any) => request<{ invitation: any }>(`/families/${familyId}/invitations`, { method: "POST", body: JSON.stringify(data) }),
  getInvitations: (familyId: number) => request<{ invitations: any[] }>(`/families/${familyId}/invitations`),
  revokeInvitation: (familyId: number, invId: number) => request<{ message: string }>(`/families/${familyId}/invitations/${invId}`, { method: "DELETE" }),
  previewInvitation: (token: string) => request<any>(`/families/invitations/preview/${token}`),
  joinFamily: (token: string, requestedRole?: string) => request<any>("/families/join", { method: "POST", body: JSON.stringify({ token, requestedRole }) }),
  updateMemberRole: (familyId: number, userId: number, newRole: string) => request<any>(`/families/${familyId}/members/${userId}/role`, { method: "PATCH", body: JSON.stringify({ newRole }) }),
  removeMember: (familyId: number, userId: number) => request<any>(`/families/${familyId}/members/${userId}`, { method: "DELETE" }),
  getAuditLog: (familyId: number) => request<{ auditLogs: any[] }>(`/families/${familyId}/audit`),

  // Dashboard Summary
  getDashboardSummary: (familyId: number) => request<any>(`/families/${familyId}/summary`),

  // Calendar
  getEvents: (familyId: number, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return request<{ events: any[] }>(`/families/${familyId}/events?${params.toString()}`);
  },
  createEvent: (familyId: number, data: any) => request<{ event: any }>(`/families/${familyId}/events`, { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (familyId: number, eventId: number | string, data: any) => request<{ event: any }>(`/families/${familyId}/events/${eventId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEvent: (familyId: number, eventId: number | string) => request<any>(`/families/${familyId}/events/${eventId}`, { method: "DELETE" }),

  // Tasks
  getTasks: (familyId: number, status?: string) => {
    const params = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<{ tasks: any[] }>(`/families/${familyId}/tasks${params}`);
  },
  createTask: (familyId: number, data: any) => request<{ task: any }>(`/families/${familyId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
  updateTask: (familyId: number, taskId: number, data: any) => request<{ task: any }>(`/families/${familyId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (familyId: number, taskId: number) => request<any>(`/families/${familyId}/tasks/${taskId}`, { method: "DELETE" }),

  // Groceries
  getGroceries: (familyId: number) => request<{ list: any; items: any[] }>(`/families/${familyId}/groceries`),
  addGroceryItem: (familyId: number, data: any) => request<{ item: any }>(`/families/${familyId}/groceries`, { method: "POST", body: JSON.stringify(data) }),
  updateGroceryItem: (familyId: number, itemId: number, data: any) => request<{ item: any }>(`/families/${familyId}/groceries/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteGroceryItem: (familyId: number, itemId: number) => request<any>(`/families/${familyId}/groceries/${itemId}`, { method: "DELETE" }),
  clearCheckedGroceries: (familyId: number) => request<any>(`/families/${familyId}/groceries/clear-checked`, { method: "POST" }),

  // Care & Medicine
  getCareOverview: (familyId: number) => request<{ carePlans: any[]; occurrences: any[]; caregivers: any[] }>(`/families/${familyId}/overview`),
  createCarePlan: (familyId: number, data: any) => request<{ plan: any }>(`/families/${familyId}/plans`, { method: "POST", body: JSON.stringify(data) }),
  acknowledgeAlert: (familyId: number, occId: number) => request<any>(`/families/${familyId}/occurrences/${occId}/acknowledge`, { method: "POST" }),
  recordMedicineOutcome: (familyId: number, occId: number, outcome: string, note?: string) => request<any>(`/families/${familyId}/occurrences/${occId}/outcome`, { method: "POST", body: JSON.stringify({ outcome, note }) }),
  updateCaregivers: (familyId: number, subjectUserId: number, caregiverUserIds: number[]) => request<any>(`/families/${familyId}/caregivers/${subjectUserId}`, { method: "PUT", body: JSON.stringify({ caregiverUserIds }) }),

  // Location & Places
  getLocationSettings: (familyId: number) => request<{ settings: any }>(`/families/${familyId}/settings/me`),
  updateLocationSettings: (familyId: number, data: any) => request<{ settings: any }>(`/families/${familyId}/settings/me`, { method: "PUT", body: JSON.stringify(data) }),
  recordLocation: (familyId: number, data: any) => request<any>(`/families/${familyId}/records`, { method: "POST", body: JSON.stringify(data) }),
  getLatestLocations: (familyId: number) => request<{ locations: any[] }>(`/families/${familyId}/latest`),
  getLocationHistory: (familyId: number, userId: number) => request<{ history: any[] }>(`/families/${familyId}/history/${userId}`),
  deleteMyLocationHistory: (familyId: number) => request<any>(`/families/${familyId}/history/me`, { method: "DELETE" }),
  searchNearbyPlaces: (familyId: number, lat: number, lon: number, radius = 2500, category = "grocery") => request<{ places: any[]; warning?: string }>(`/families/${familyId}/search?latitude=${lat}&longitude=${lon}&radius=${radius}&category=${category}`),
  getSavedLocations: (familyId: number) => request<{ locations: any[] }>(`/families/${familyId}/saved`),
  createSavedLocation: (familyId: number, data: any) => request<{ location: any }>(`/families/${familyId}/saved`, { method: "POST", body: JSON.stringify(data) }),
  deleteSavedLocation: (familyId: number, id: number) => request<any>(`/families/${familyId}/saved/${id}`, { method: "DELETE" }),

  // Finance / Bills
  getBills: (familyId: number, status?: string) => request<{ bills: any[] }>(`/families/${familyId}/bills${status ? `?status=${status}` : ""}`),
  createBill: (familyId: number, data: any) => request<{ bill: any }>(`/families/${familyId}/bills`, { method: "POST", body: JSON.stringify(data) }),
  markBillPaid: (familyId: number, billId: number, verified = false) => request<{ bill: any }>(`/families/${familyId}/bills/${billId}/mark-paid`, { method: "POST", body: JSON.stringify({ verified }) }),

  // Documents
  getDocuments: (familyId: number) => request<{ documents: any[] }>(`/families/${familyId}/documents`),
  uploadDocument: (familyId: number, formData: FormData) => request<{ document: any }>(`/families/${familyId}/documents`, { method: "POST", body: formData }),
  deleteDocument: (familyId: number, docId: number) => request<any>(`/families/${familyId}/documents/${docId}`, { method: "DELETE" }),

  // Inventory
  getInventory: (familyId: number) => request<{ items: any[] }>(`/families/${familyId}/inventory`),
  createInventoryItem: (familyId: number, data: any) => request<{ item: any }>(`/families/${familyId}/inventory`, { method: "POST", body: JSON.stringify(data) }),
  updateInventoryItem: (familyId: number, itemId: number, data: any) => request<{ item: any }>(`/families/${familyId}/inventory/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteInventoryItem: (familyId: number, itemId: number) => request<any>(`/families/${familyId}/inventory/${itemId}`, { method: "DELETE" }),

  // Requests
  getRequests: (familyId: number) => request<{ requests: any[] }>(`/families/${familyId}/requests`),
  createRequest: (familyId: number, data: any) => request<{ request: any }>(`/families/${familyId}/requests`, { method: "POST", body: JSON.stringify(data) }),
  updateRequestStatus: (familyId: number, reqId: number, status: string, notes?: string) => request<{ request: any }>(`/families/${familyId}/requests/${reqId}/status`, { method: "PATCH", body: JSON.stringify({ status, notes }) }),

  // AI Assistant
  getAiStatus: () => request<{ configured: boolean; model: string }>("/ai/status"),
  askAiAssistant: (familyId: number, message: string) => request<{ reply: string; action?: any }>(`/families/${familyId}/assist`, { method: "POST", body: JSON.stringify({ message }) }),

  // Notifications
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>("/notifications"),
  markNotificationRead: (id: number) => request<any>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request<any>("/notifications/read-all", { method: "POST" }),
};
