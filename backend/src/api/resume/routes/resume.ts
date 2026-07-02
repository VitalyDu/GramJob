export default {
  routes: [
    // GET /resumes — requires Max plan
    {
      method: 'GET',
      path: '/resumes',
      handler: 'resume.findPublic',
      config: {
        policies: ['api::resume.requires-max-plan'],
      },
    },

    // Authenticated routes without :id — MUST come before /:id
    {
      method: 'GET',
      path: '/resumes/my',
      handler: 'resume.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/resumes',
      handler: 'resume.create',
      config: {},
    },

    // Detail by documentId: owner or Max/VIP plan (checked in controller),
    // contacts masking done in controller
    {
      method: 'GET',
      path: '/resumes/:id',
      handler: 'resume.findOne',
      config: {},
    },

    // Owner-only via policy
    {
      method: 'POST',
      path: '/resumes/:id/publish',
      handler: 'resume.publish',
      config: {
        policies: ['api::resume.is-resume-owner'],
      },
    },
    {
      method: 'PUT',
      path: '/resumes/:id',
      handler: 'resume.update',
      config: {
        policies: ['api::resume.is-resume-owner'],
      },
    },
    {
      method: 'DELETE',
      path: '/resumes/:id',
      handler: 'resume.archive',
      config: {
        policies: ['api::resume.is-resume-owner'],
      },
    },
  ],
}
