export type PaymentIntentPayload =
  | { type: 'subscription'; planCode: string; userId: number }
  | { type: 'vacancy_pack'; packageId: number; userId: number }
  | { type: 'apply_pack'; packageId: number; userId: number }
  | { type: 'urgent'; vacancyDocumentId: string; userId: number }
  | { type: 'top_placement'; vacancyDocumentId: string; userId: number }
