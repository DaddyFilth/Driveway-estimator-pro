import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#07100d] px-4 text-white">
      <Card className="mx-4 w-full max-w-lg border border-white/10 bg-[#0b1713] shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-sm">
        <CardContent className="pb-8 pt-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-red-400/20" />
              <AlertCircle className="relative h-16 w-16 text-red-200" />
            </div>
          </div>

          <h1 className="mb-2 text-4xl font-bold text-white">404</h1>

          <h2 className="mb-4 text-xl font-semibold text-slate-200">
            Page Not Found
          </h2>

          <p className="mb-8 leading-relaxed text-slate-300">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col justify-center gap-3 sm:flex-row"
          >
            <Button
              onClick={handleGoHome}
              className="rounded-lg bg-[#0f7c43] px-6 py-2.5 text-white shadow-md transition-all duration-200 hover:bg-[#119653] hover:shadow-lg"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
