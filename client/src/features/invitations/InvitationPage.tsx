import { Copy, Mail, Save, Share2, Sparkles } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { UnavailableAction } from '@/components/UnavailableAction'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDemoStore } from '@/demo/DemoStore'
import { AI_PENDING_REASON } from '@/lib/pending'
import { INVITATION_TONES, type InvitationTone } from '@/types'
import { useEvent } from '../events/useEvent'

const MAX_LENGTH = 2000
const TONE_HINT: Record<InvitationTone, string> = {
  formal: 'Polished wording for elders, colleagues and ceremonies.',
  friendly: 'Warm and casual, great for family and friends.',
  traditional: 'Respectful, with customary blessings and greetings.',
  modern: 'Short, playful and ready for messaging apps.',
}

export default function InvitationPage() {
  const event = useEvent()
  const { actions } = useDemoStore()
  const [text, setText] = useState(event.invitationText)
  const [tone, setTone] = useState<InvitationTone>(event.invitationTone)
  const editorId = useId()
  const dirty = text !== event.invitationText || tone !== event.invitationTone

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Invitation copied to clipboard')
    } catch {
      toast.error('Couldn’t copy — select the text and copy it manually.')
    }
  }

  async function share() {
    if (!navigator.share) {
      await copy()
      return
    }
    try {
      await navigator.share({ title: event.eventName, text })
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') toast.error('Sharing failed. Try copying instead.')
    }
  }

  function save() {
    actions.updateEvent(event.id, { invitationText: text, invitationTone: tone })
    toast.success('Invitation saved')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Card className="gap-4 p-5">
          <fieldset>
            <legend className="mb-3 font-semibold">Tone</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {INVITATION_TONES.map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <span className="flex items-center gap-2 text-sm font-medium capitalize">
                    <input type="radio" name="tone" value={t} checked={tone === t} onChange={() => setTone(t)} className="accent-primary" />
                    {t}
                  </span>
                  <span className="text-xs text-muted-foreground">{TONE_HINT[t]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <UnavailableAction icon={Sparkles} label={`Generate ${tone} invitation`} reason={AI_PENDING_REASON} />
        </Card>

        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between">
            <Label htmlFor={editorId} className="font-semibold">Invitation text</Label>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {text.length}/{MAX_LENGTH}
            </span>
          </div>
          <Textarea
            id={editorId}
            rows={12}
            maxLength={MAX_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your invitation here, or generate one once the assistant is connected."
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={!dirty}>
              <Save aria-hidden="true" /> {dirty ? 'Save changes' : 'Saved'}
            </Button>
            <Button variant="outline" onClick={copy} disabled={!text.trim()}>
              <Copy aria-hidden="true" /> Copy
            </Button>
            <Button variant="outline" onClick={share} disabled={!text.trim()}>
              <Share2 aria-hidden="true" /> Share
            </Button>
          </div>
        </Card>
      </div>

      <section aria-labelledby="preview-heading">
        <h2 id="preview-heading" className="mb-3 font-semibold">Preview</h2>
        <div className="rounded-3xl bg-secondary p-4 sm:p-8">
          <article className="mx-auto max-w-md rounded-2xl border-t-4 border-gold bg-card p-6 shadow-sm sm:p-8">
            <Mail className="mx-auto mb-4 size-6 text-coral" aria-hidden="true" />
            {text.trim() ? (
              // Rendered as plain text (never HTML), so pasted markup can't inject scripts.
              <p className="text-center leading-relaxed whitespace-pre-wrap">{text}</p>
            ) : (
              <p className="text-center text-muted-foreground">Your invitation preview appears here.</p>
            )}
          </article>
        </div>
      </section>
    </div>
  )
}
