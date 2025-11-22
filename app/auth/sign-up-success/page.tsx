import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MailCheck } from "lucide-react"

export default function SignUpSuccess() {
  return (
    <Card className="w-full max-w-md border-green-200 shadow-xl shadow-green-500/5">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <MailCheck className="h-8 w-8" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-green-700">Check your email</CardTitle>
        <CardDescription>
          We've sent you a confirmation link. Please check your email to verify your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>Once you've verified your email, you can sign in to your account.</p>
      </CardContent>
      <CardFooter className="flex justify-center p-6">
        <Link href="/auth/login" className="w-full">
          <Button variant="outline" className="w-full bg-transparent">
            Return to Sign In
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
