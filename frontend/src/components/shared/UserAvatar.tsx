import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  user: { firstName?: string | null; email?: string | null; avatar?: string | null }
  className?: string
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const initial = (user.firstName?.charAt(0) ?? user.email?.charAt(0) ?? '?').toUpperCase()
  return (
    <Avatar className={cn('h-8 w-8', className)}>
      {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
