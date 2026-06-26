import { apiSlice } from './apiSlice';

export const coreApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ── Subscription Plans ──
    getPlans: builder.query({
      query: (params) => ({ url: '/plans', params }),
      providesTags: ['Fee'],
    }),
    createPlan: builder.mutation({
      query: (body) => ({ url: '/plans', method: 'POST', body }),
      invalidatesTags: ['Fee'],
    }),
    updatePlan: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/plans/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Fee'],
    }),
    deletePlan: builder.mutation({
      query: (id) => ({ url: `/plans/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Fee'],
    }),

    // ── Institutes ──
    getInstitutes: builder.query({
      query: (params) => ({ url: '/institutes', params }),
      providesTags: ['Institute'],
    }),
    createInstitute: builder.mutation({
      query: (body) => ({ url: '/institutes', method: 'POST', body }),
      invalidatesTags: ['Institute'],
    }),
    updateInstitute: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/institutes/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Institute'],
    }),
    suspendInstitute: builder.mutation({
      query: (id) => ({ url: `/institutes/${id}`, method: 'PUT', body: { status: 'SUSPENDED' } }),
      invalidatesTags: ['Institute'],
    }),
    activateInstitute: builder.mutation({
      query: (id) => ({ url: `/institutes/${id}`, method: 'PUT', body: { status: 'ACTIVE' } }),
      invalidatesTags: ['Institute'],
    }),
    deleteInstitute: builder.mutation({
      query: (id) => ({ url: `/institutes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Institute'],
    }),

    // ── Branches ──
    getBranches: builder.query({
      query: (params) => ({ url: '/branches', params }),
      providesTags: ['Branch'],
    }),
    createBranch: builder.mutation({
      query: (body) => ({ url: '/branches', method: 'POST', body }),
      invalidatesTags: ['Branch'],
    }),
    updateBranch: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/branches/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Branch'],
    }),
    deleteBranch: builder.mutation({
      query: (id) => ({ url: `/branches/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Branch'],
    }),

    // ── Academic Sessions ──
    getSessions: builder.query({
      query: (params) => ({ url: '/sessions', params }),
      providesTags: ['Session'],
    }),
    createSession: builder.mutation({
      query: (body) => ({ url: '/sessions', method: 'POST', body }),
      invalidatesTags: ['Session'],
    }),
    updateSession: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/sessions/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Session'],
    }),
    deleteSession: builder.mutation({
      query: (id) => ({ url: `/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Session'],
    }),
    updateSessionStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/sessions/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Session'],
    }),

    // ── Classes ──
    getClasses: builder.query({
      query: (params) => ({ url: '/classes', params }),
      providesTags: ['Class'],
    }),
    createClass: builder.mutation({
      query: (body) => ({ url: '/classes', method: 'POST', body }),
      invalidatesTags: ['Class'],
    }),
    updateClass: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/classes/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Class'],
    }),
    deleteClass: builder.mutation({
      query: (id) => ({ url: `/classes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Class'],
    }),

    // ── Sections ──
    getSections: builder.query({
      query: (params) => ({ url: '/sections', params }),
      providesTags: ['Section'],
    }),
    createSection: builder.mutation({
      query: (body) => ({ url: '/sections', method: 'POST', body }),
      invalidatesTags: ['Section'],
    }),
    updateSection: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/sections/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Section'],
    }),
    deleteSection: builder.mutation({
      query: (id) => ({ url: `/sections/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Section'],
    }),

    // ── Subjects ──
    getSubjects: builder.query({
      query: (params) => ({ url: '/subjects', params }),
      providesTags: ['Subject'],
    }),
    createSubject: builder.mutation({
      query: (body) => ({ url: '/subjects', method: 'POST', body }),
      invalidatesTags: ['Subject'],
    }),
    updateSubject: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/subjects/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Subject'],
    }),
    deleteSubject: builder.mutation({
      query: (id) => ({ url: `/subjects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Subject'],
    }),

    // ── Auth Endpoints ──
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    getUsers: builder.query({
      query: (params) => ({ url: '/users', params }),
      providesTags: ['User'],
    }),
    getCourseStudents: builder.query({
      query: (courseId) => `/enrollments/course/${courseId}?status=ACTIVE&limit=1000`,
      providesTags: (result, error, id) => [{ type: 'Enrollment', id }],
    }),
    createUser: builder.mutation({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    bulkImportStudents: builder.mutation({
      query: (body) => ({ url: '/users/bulk-import', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    changeUserStatus: builder.mutation({
      query: ({ id, isActive }) => ({ url: `/users/${id}/status`, method: 'PATCH', body: { isActive } }),
      invalidatesTags: ['User'],
    }),

    // ── Courses ──
    getCourses: builder.query({
      query: (params) => ({ url: '/courses', params }),
      providesTags: ['Course'],
    }),
    createCourse: builder.mutation({
      query: (body) => ({ url: '/courses', method: 'POST', body }),
      invalidatesTags: ['Course'],
    }),
    updateCourse: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/courses/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Course'],
    }),
    deleteCourse: builder.mutation({
      query: (id) => ({ url: `/courses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Course'],
    }),
    publishCourse: builder.mutation({
      query: (id) => ({ url: `/courses/${id}/publish`, method: 'PATCH' }),
      invalidatesTags: ['Course'],
    }),

    // ── Enrollments ──
    getEnrollments: builder.query({
      query: (params) => ({ url: '/enrollments', params }),
      providesTags: ['Enrollment'],
    }),
    createEnrollment: builder.mutation({
      query: (body) => ({ url: '/enrollments', method: 'POST', body }),
      invalidatesTags: ['Enrollment'],
    }),
    bulkEnrollStudents: builder.mutation({
      query: (body) => ({ url: '/enrollments/bulk', method: 'POST', body }),
      invalidatesTags: ['Enrollment'],
    }),
    updateEnrollmentStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/enrollments/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Enrollment'],
    }),
    deleteEnrollment: builder.mutation({
      query: (id) => ({ url: `/enrollments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Enrollment'],
    }),

    // ── Assignments ──
    getAssignments: builder.query({
      query: (params) => ({ url: '/assignments', params }),
      providesTags: ['Assignment'],
    }),
    createAssignment: builder.mutation({
      query: (body) => ({ url: '/assignments', method: 'POST', body }),
      invalidatesTags: ['Assignment'],
    }),
    updateAssignment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/assignments/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Assignment'],
    }),
    deleteAssignment: builder.mutation({
      query: (id) => ({ url: `/assignments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Assignment'],
    }),

    // ── Submissions ──
    getSubmissions: builder.query({
      query: (params) => {
        if (params?.my) {
          const { my, ...rest } = params;
          return { url: '/submissions/my', params: rest };
        }
        if (params?.assignmentId) {
          const { assignmentId, ...rest } = params;
          return { url: `/submissions/assignment/${assignmentId}`, params: rest };
        }
        if (params?.studentId) {
          const { studentId, ...rest } = params;
          return { url: `/submissions/student/${studentId}`, params: rest };
        }
        return { url: '/submissions', params };
      },
      providesTags: ['Submission'],
    }),
    deleteSubmission: builder.mutation({
      query: (id) => ({ url: `/submissions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Submission'],
    }),
    createSubmission: builder.mutation({
      query: ({ assignmentId, ...body }) => ({ url: `/submissions/assignment/${assignmentId}`, method: 'POST', body }),
      invalidatesTags: ['Submission'],
    }),
    gradeSubmission: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/submissions/${id}/grade`, method: 'PATCH', body }),
      invalidatesTags: ['Submission'],
    }),

    // ── Attendance ──
    getAttendance: builder.query({
      query: (params) => ({ url: '/attendance', params }),
      providesTags: ['Attendance'],
    }),
    getStudentAttendance: builder.query({
      query: ({ studentId, ...params }) => ({ url: `/attendance/student/${studentId}`, params }),
      providesTags: ['Attendance'],
    }),
    takeAttendance: builder.mutation({
      query: (body) => ({ url: '/attendance', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    generateQRSession: builder.mutation({
      query: (body) => ({ url: '/attendance/session', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    scanQRCheckin: builder.mutation({
      query: (body) => ({ url: '/attendance/scan', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),

    // ── Daily Gate Attendance (New) ──
    getDailyAttendanceReports: builder.query({
      query: (params) => ({ url: '/daily-attendance/reports', params }),
      providesTags: ['DailyAttendance'],
    }),
    scanGateAttendance: builder.mutation({
      query: (body) => ({ url: '/daily-attendance/scan', method: 'POST', body }),
      invalidatesTags: ['DailyAttendance'],
    }),

    // ── Exams ──
    getExams: builder.query({
      query: (params) => ({ url: '/exams', params }),
      providesTags: ['Exam'],
    }),
    createExam: builder.mutation({
      query: (body) => ({ url: '/exams', method: 'POST', body }),
      invalidatesTags: ['Exam'],
    }),
    updateExam: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/exams/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Exam'],
    }),
    deleteExam: builder.mutation({
      query: (id) => ({ url: `/exams/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Exam'],
    }),

    // ── Exam Schedules ──
    getExamSchedules: builder.query({
      query: (params) => ({ url: '/exam-schedules', params }),
      providesTags: ['ExamSchedule'],
    }),
    createExamSchedule: builder.mutation({
      query: (body) => ({ url: '/exam-schedules', method: 'POST', body }),
      invalidatesTags: ['ExamSchedule'],
    }),
    updateExamSchedule: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/exam-schedules/${id}`, method: 'PUT', body }),
      invalidatesTags: ['ExamSchedule'],
    }),
    deleteExamSchedule: builder.mutation({
      query: (id) => ({ url: `/exam-schedules/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ExamSchedule'],
    }),

    // ── Results ──
    getResults: builder.query({
      query: (params) => ({ url: '/results', params }),
      providesTags: ['Result'],
    }),
    getMyResults: builder.query({
      query: (params) => ({ url: '/results/my', params }),
      providesTags: ['Result'],
    }),
    createResult: builder.mutation({
      query: (body) => ({ url: '/results', method: 'POST', body }),
      invalidatesTags: ['Result'],
    }),
    publishResult: builder.mutation({
      query: (id) => ({ url: `/results/${id}/publish`, method: 'PATCH' }),
      invalidatesTags: ['Result'],
    }),
    bulkUploadResults: builder.mutation({
      query: (body) => ({ url: '/results/bulk', method: 'POST', body }),
      invalidatesTags: ['Result'],
    }),
    updateResult: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/results/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Result'],
    }),
    deleteResult: builder.mutation({
      query: (id) => ({ url: `/results/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Result'],
    }),

    // ── Report Cards ──
    getReportCards: builder.query({
      query: (params) => ({ url: '/report-cards', params }),
      providesTags: ['ReportCard'],
    }),
    getStudentReportCards: builder.query({
      query: (studentId) => ({ url: `/report-cards/student/${studentId}` }),
      providesTags: ['ReportCard'],
    }),
    generateReportCard: builder.mutation({
      query: (body) => ({ url: '/report-cards/generate', method: 'POST', body }),
      invalidatesTags: ['ReportCard'],
    }),
    publishReportCard: builder.mutation({
      query: (id) => ({ url: `/report-cards/${id}/publish`, method: 'PATCH' }),
      invalidatesTags: ['ReportCard'],
    }),

    // ── Academic Records ──
    getAcademicRecords: builder.query({
      query: (params) => ({ url: '/academic-records', params }),
      providesTags: ['AcademicRecord'],
    }),

    // ── Fees & Payments ──
    getFeeStructures: builder.query({
      query: (params) => ({ url: '/fees', params }),
      providesTags: ['Fee'],
    }),
    createFeeStructure: builder.mutation({
      query: (body) => ({ url: '/fees', method: 'POST', body }),
      invalidatesTags: ['Fee'],
    }),
    getInvoices: builder.query({
      query: (params) => ({ url: '/fee-invoices', params }),
      providesTags: ['FeeInvoice'],
    }),
    createInvoice: builder.mutation({
      query: (body) => ({ url: '/fee-invoices', method: 'POST', body }),
      invalidatesTags: ['FeeInvoice'],
    }),
    getPayments: builder.query({
      query: (params) => ({ url: '/payments', params }),
      providesTags: ['Payment'],
    }),
    recordPayment: builder.mutation({
      query: (body) => ({ url: '/payments', method: 'POST', body }),
      invalidatesTags: ['Payment', 'FeeInvoice'],
    }),

    // ── Parent Portal ──
    getParentChildren: builder.query({
      query: () => '/parent-portal/children',
      providesTags: ['User'],
    }),
    getParentChildAttendance: builder.query({
      query: ({ childId, ...params }) => ({ url: `/parent-portal/children/${childId}/attendance`, params }),
      providesTags: ['Attendance'],
    }),
    getParentChildAssignments: builder.query({
      query: ({ childId, ...params }) => ({ url: `/parent-portal/children/${childId}/assignments`, params }),
      providesTags: ['Assignment'],
    }),
    getParentChildResults: builder.query({
      query: ({ childId, ...params }) => ({ url: `/parent-portal/children/${childId}/results`, params }),
      providesTags: ['Result'],
    }),
    getParentChildFees: builder.query({
      query: ({ childId, ...params }) => ({ url: `/parent-portal/children/${childId}/fees`, params }),
      providesTags: ['FeeInvoice'],
    }),

    // ── Notifications ──
    getNotifications: builder.query({
      query: (params) => ({ url: '/notifications', params }),
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),

    // ── Announcements ──
    getAnnouncements: builder.query({
      query: (params) => ({ url: '/announcements', params }),
      providesTags: ['Announcement'],
    }),
    createAnnouncement: builder.mutation({
      query: (body) => ({ url: '/announcements', method: 'POST', body }),
      invalidatesTags: ['Announcement'],
    }),
    deleteAnnouncement: builder.mutation({
      query: (id) => ({ url: `/announcements/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Announcement'],
    }),

    // ── Analytics ──
    getAnalyticsStats: builder.query({
      query: (params) => ({ url: '/analytics', params }),
    }),

    // ── Dashboard Stats ──
    getSuperDashboardStats: builder.query({
      query: () => '/dashboard/super',
    }),
    getInstituteDashboardStats: builder.query({
      query: () => '/dashboard/institute',
    }),
    getBranchDashboardStats: builder.query({
      query: () => '/dashboard/branch',
    }),
    getStudentDashboardStats: builder.query({
      query: () => '/dashboard/student',
    }),

    // ── Certificates ──
    getCertificates: builder.query({
      query: (params) => ({ url: '/certificates', params }),
      providesTags: ['Certificate'],
    }),
    generateCertificate: builder.mutation({
      query: (body) => ({ url: '/certificates/generate', method: 'POST', body }),
      invalidatesTags: ['Certificate'],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeletePlanMutation,
  
  useGetInstitutesQuery,
  useCreateInstituteMutation,
  useUpdateInstituteMutation,
  useSuspendInstituteMutation,
  useActivateInstituteMutation,
  useDeleteInstituteMutation,

  useGetBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,

  useGetSessionsQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useUpdateSessionStatusMutation,

  useGetClassesQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,

  useGetSectionsQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,

  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,

  useGetUsersQuery,
  useGetCourseStudentsQuery,
  useCreateUserMutation,
  useBulkImportStudentsMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useChangeUserStatusMutation,

  useGetCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  usePublishCourseMutation,

  useGetEnrollmentsQuery,
  useCreateEnrollmentMutation,
  useBulkEnrollStudentsMutation,
  useUpdateEnrollmentStatusMutation,
  useDeleteEnrollmentMutation,

  useGetAssignmentsQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,

  useGetSubmissionsQuery,
  useCreateSubmissionMutation,
  useDeleteSubmissionMutation,
  useGradeSubmissionMutation,

  useGetAttendanceQuery,
  useGetStudentAttendanceQuery,
  useTakeAttendanceMutation,
  useGenerateQRSessionMutation,
  useScanQRCheckinMutation,
  useGetDailyAttendanceReportsQuery,
  useScanGateAttendanceMutation,

  useGetExamsQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,

  useGetExamSchedulesQuery,
  useCreateExamScheduleMutation,
  useUpdateExamScheduleMutation,
  useDeleteExamScheduleMutation,

  useGetResultsQuery,
  useGetMyResultsQuery,
  useCreateResultMutation,
  usePublishResultMutation,
  useBulkUploadResultsMutation,
  useUpdateResultMutation,
  useDeleteResultMutation,

  useGetReportCardsQuery,
  useGetStudentReportCardsQuery,
  useGenerateReportCardMutation,
  usePublishReportCardMutation,

  useGetAcademicRecordsQuery,

  useGetFeeStructuresQuery,
  useCreateFeeStructureMutation,
  useGetInvoicesQuery,
  useCreateInvoiceMutation,
  useGetPaymentsQuery,
  useRecordPaymentMutation,

  useGetParentChildrenQuery,
  useGetParentChildAttendanceQuery,
  useGetParentChildAssignmentsQuery,
  useGetParentChildResultsQuery,
  useGetParentChildFeesQuery,

  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,

  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useDeleteAnnouncementMutation,

  useGetAnalyticsStatsQuery,

  useGetSuperDashboardStatsQuery,
  useGetInstituteDashboardStatsQuery,
  useGetBranchDashboardStatsQuery,
  useGetStudentDashboardStatsQuery,

  useGetMeQuery,

  useGetCertificatesQuery,
  useGenerateCertificateMutation,
} = coreApiSlice;
