import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Gift,
  Inbox,
  Mail,
  Megaphone,
  Send,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { NotificationType } from '@/types/api'

export const NOTIFICATION_TYPE_ICONS: Partial<Record<NotificationType, LucideIcon>> = {
  new_application: Mail,
  application_in_review: Inbox,
  application_approved: CheckCircle2,
  application_rejected: XCircle,
  interview_invitation: Calendar,
  test_task: FileText,
  offer_received: Gift,
  resume_viewed: Eye,
  invitation_to_apply: Send,
  vacancy_viewed: Eye,
  vacancy_expiring_soon: Clock,
  vacancy_expired: AlertCircle,
  subscription_expiring: AlertTriangle,
  subscription_expired: AlertCircle,
  payment_completed: CreditCard,
  limits_reached: Ban,
  saved_search_match: Bell,
  moderation_approved: CheckCircle2,
  moderation_rejected: XCircle,
}

export const DEFAULT_NOTIFICATION_ICON: LucideIcon = Megaphone

export function stripLeadingEmoji(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}️‍]+\s*/u, '')
}
