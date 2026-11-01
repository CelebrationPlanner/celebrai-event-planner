import { useMutation } from '@tanstack/react-query'
import { CircleHelp, LoaderCircle, Sparkles, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { api, errorMessage } from '@/lib/api'
import { useRefreshEvent } from '@/lib/queries'

/**
 * Generates (or regenerates) the plan. The backend answers with either follow-up questions
 * (critical details missing) or a validated plan; failures are shown inline, nothing is faked.
 */
export function GeneratePlan({ eventId, regenerate = false }: { eventId: string; regenerate?: boolean }) {
  const refresh = useRefreshEvent()
  const [questions, setQuestions] = useState<string[]>([])
  const generate = useMutation({
    mutationFn: () => api.generatePlan(eventId, regenerate),
    onSuccess: async (result) => {
      if (result.kind === 'clarification') return setQuestions(result.questions)
      setQuestions([])
      await refresh(eventId)
      toast.success(result.reused ? 'Your plan is already up to date' : `Plan version ${result.version} is ready`)
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="self-start">
        {generate.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        {generate.isPending ? 'Planning… this can take up to a minute' : regenerate ? 'Regenerate plan' : 'Generate plan'}
      </Button>
      {questions.length > 0 && (
        <Alert role="status">
          <CircleHelp aria-hidden="true" />
          <AlertTitle>A few details first</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <Link to={`/events/${eventId}/planner`} className="font-medium text-primary underline underline-offset-2">
              Answer in the assistant
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {generate.error && (
        <Alert variant="destructive" role="alert">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Couldn’t generate the plan</AlertTitle>
          <AlertDescription>{errorMessage(generate.error)}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
