import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-semibold tracking-tight mb-3">
          Find your political match
        </h1>
        <p className="text-muted-foreground text-lg">
          See which legislators and bills align with your priorities — no spin, no agenda.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" onClick={() => navigate('/survey?mode=sliders')}>
          Use value sliders
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate('/survey?mode=text')}>
          Describe in your own words
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        "Here's who aligns with your stated priorities" — not "Vote for X"
      </p>
    </div>
  )
}