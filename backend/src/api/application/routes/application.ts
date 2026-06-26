export default {
  routes: [
    // Candidate: view own applications
    {
      method: 'GET',
      path: '/applications',
      handler: 'application.findMine',
      config: {},
    },

    // Candidate: submit application
    {
      method: 'POST',
      path: '/applications',
      handler: 'application.create',
      config: {},
    },

    // Employer: view applications for a specific vacancy
    // NOTE: path starts with /vacancies but handler lives in application controller
    {
      method: 'GET',
      path: '/vacancies/:id/applications',
      handler: 'application.findByVacancy',
      config: {},
    },

    // Employer: update application status
    {
      method: 'PATCH',
      path: '/applications/:id',
      handler: 'application.updateStatus',
      config: {},
    },
  ],
}
