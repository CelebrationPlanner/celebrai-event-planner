// Ready-made invitation wording for each tone, filled from the event. Works without AI.
// Unknown details become bracketed placeholders rather than invented facts.
import { formatDate } from '@/lib/dates'
import { occasionLabel, type CelebrationEvent, type InvitationTone } from '@/types'

export function invitationTemplate(event: CelebrationEvent, tone: InvitationTone): string {
  const name = event.eventName
  const date = event.eventDate
    ? formatDate(event.eventDate, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    : '[Date to be confirmed]'
  const place = event.location || '[Venue to be confirmed]'
  const occasion = (occasionLabel(event.occasion) ?? 'celebration').toLowerCase()
  const theme = event.themePreferences[0]

  switch (tone) {
    case 'formal':
      return (
        `You are cordially invited to ${name}.\n\nDate: ${date}\nTime: [Time]\nVenue: ` +
        `${place}\n\nWe would be honoured by your presence. Kindly RSVP by [RSVP date].`
      )
    case 'friendly':
      return (
        `You're invited! 🎉\n\nCome celebrate ${name} with us.\n\n📅 ${date}\n⏰ [Time]\n📍 ` +
        `${place}\n${theme ? `\nTheme: ${theme} — dress up if you like!\n` : ''}\nLet us know if you can make it by [RSVP date]. Can't wait to see you!`
      )
    case 'traditional':
      return (
        `With joy in our hearts and the blessings of our elders, we invite you and your family to ${name}.\n\nDate: ${date}\nTime: ` +
        `[Time]\nVenue: ${place}\n\nYour presence and blessings will make this ${occasion} complete. Kindly confirm by [RSVP date].`
      )
    case 'modern':
      return `${name} ✨\n${date} · [Time] · ${place}\n\nYou in? RSVP by [RSVP date].`
  }
}

/** Share targets that need no account integration: the user's own WhatsApp or mail app. */
export function shareLinks(text: string, subject: string) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
  }
}
