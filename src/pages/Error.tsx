import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface ErrorPageProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showRetryButton?: boolean;
  onRetry?: () => void;
}

export default function ErrorPage({
  title = "Something went wrong",
  message = "We're sorry, but something unexpected happened. Our team has been notified.",
  showHomeButton = true,
  showRetryButton = false,
  onRetry,
}: ErrorPageProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-secondary rounded-full p-4 w-24 h-24 flex items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
        </CardHeader>

        <CardContent className="text-center">
          <p className="text-muted-foreground">{message}</p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {showRetryButton && (
            <Button className="w-full" onClick={onRetry}>
              Try Again
            </Button>
          )}

          {showHomeButton && (
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">{"Go to Homepage"}</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
