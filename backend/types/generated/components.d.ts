import type { Schema, Struct } from '@strapi/strapi'

export interface ResumeEducation extends Struct.ComponentSchema {
  collectionName: 'components_resume_educations'
  info: {
    displayName: 'Education'
    pluralName: 'educations'
    singularName: 'education'
  }
  attributes: {
    current: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    degree: Schema.Attribute.String & Schema.Attribute.Required
    endDate: Schema.Attribute.Date
    field: Schema.Attribute.String & Schema.Attribute.Required
    institution: Schema.Attribute.String & Schema.Attribute.Required
    startDate: Schema.Attribute.Date & Schema.Attribute.Required
  }
}

export interface ResumeWorkExperience extends Struct.ComponentSchema {
  collectionName: 'components_resume_work_experiences'
  info: {
    displayName: 'Work Experience'
    pluralName: 'work-experiences'
    singularName: 'work-experience'
  }
  attributes: {
    company: Schema.Attribute.String & Schema.Attribute.Required
    current: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    description: Schema.Attribute.Text
    endDate: Schema.Attribute.Date
    position: Schema.Attribute.String & Schema.Attribute.Required
    startDate: Schema.Attribute.Date & Schema.Attribute.Required
  }
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'resume.education': ResumeEducation
      'resume.work-experience': ResumeWorkExperience
    }
  }
}
